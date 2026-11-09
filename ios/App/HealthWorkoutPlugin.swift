import Foundation
import Capacitor
import HealthKit

/// Release A3 (owner-approved Nov 9, healthkit_write_v1): saves ONE Apple Health workout per
/// completed Hammers Today card and deletes exactly that workout when the card is un-marked.
/// Writes only: the activity type, the real start and end, and (sprint/conditioning cards only)
/// the logged distance. Never calories, heart rate or anything not measured. Reading stays on
/// @capgo/capacitor-health. Uses HKWorkoutBuilder (Apple's current workout API; HKWorkout(...)
/// initializers are deprecated). Every object carries the Hammers completion id, so a retry
/// replaces instead of duplicating, and deletion targets only what this app saved.
@objc(HealthWorkoutPlugin)
public class HealthWorkoutPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthWorkoutPlugin"
    public let jsName = "HealthWorkouts"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authorizationStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveWorkout", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteWorkout", returnType: CAPPluginReturnPromise)
    ]

    private let store = HKHealthStore()
    private static let completionKey = "HammersCompletionId"
    private var distanceType: HKQuantityType { HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)! }

    private static func activityType(_ name: String) -> HKWorkoutActivityType? {
        switch name {
        case "traditionalStrengthTraining": return .traditionalStrengthTraining
        case "highIntensityIntervalTraining": return .highIntensityIntervalTraining
        case "baseball": return .baseball
        case "softball": return .softball
        case "preparationAndRecovery": return .preparationAndRecovery
        case "flexibility": return .flexibility
        case "cooldown": return .cooldown
        default: return nil
        }
    }

    private static func statusName(_ s: HKAuthorizationStatus) -> String {
        switch s {
        case .sharingAuthorized: return "authorized"
        case .sharingDenied: return "denied"
        default: return "notDetermined"
        }
    }

    private static func parseDate(_ s: String?) -> Date? {
        guard let s = s else { return nil }
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = f.date(from: s) { return d }
        f.formatOptions = [.withInternetDateTime]
        return f.date(from: s)
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    /// Apple reveals write (share) permission, so a later revoke in iPhone Settings is visible.
    @objc func authorizationStatus(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else { call.resolve(["workouts": "unavailable", "distance": "unavailable"]); return }
        call.resolve([
            "workouts": Self.statusName(store.authorizationStatus(for: HKObjectType.workoutType())),
            "distance": Self.statusName(store.authorizationStatus(for: distanceType))
        ])
    }

    /// WRITE permission for workouts (and running distance) only. Nothing is read.
    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else { call.reject("Apple Health is not available", "UNAVAILABLE"); return }
        let share: Set<HKSampleType> = [HKObjectType.workoutType(), distanceType]
        store.requestAuthorization(toShare: share, read: nil) { _, error in
            if let error = error { call.reject(error.localizedDescription, "AUTH_FAILED"); return }
            call.resolve(["workouts": Self.statusName(self.store.authorizationStatus(for: HKObjectType.workoutType()))])
        }
    }

    @objc func saveWorkout(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else { call.reject("Apple Health is not available", "UNAVAILABLE"); return }
        guard let completionId = call.getString("completionId"), !completionId.isEmpty,
              let typeName = call.getString("activityType"), let type = Self.activityType(typeName),
              let start = Self.parseDate(call.getString("start")), let end = Self.parseDate(call.getString("end")),
              end > start else {
            call.reject("completionId, activityType, start and end (end after start) are required", "BAD_ARGS"); return
        }
        guard store.authorizationStatus(for: HKObjectType.workoutType()) == .sharingAuthorized else {
            call.reject("Apple Health permission is off", "NOT_AUTHORIZED"); return
        }
        let config = HKWorkoutConfiguration()
        config.activityType = type
        let builder = HKWorkoutBuilder(healthStore: store, configuration: config, device: nil)
        let meta: [String: Any] = [
            HKMetadataKeySyncIdentifier: completionId,
            HKMetadataKeySyncVersion: NSNumber(value: 1),
            Self.completionKey: completionId
        ]
        let meters = call.getDouble("distanceMeters") ?? 0
        let withDistance = meters > 0 && store.authorizationStatus(for: distanceType) == .sharingAuthorized
        builder.beginCollection(withStart: start) { ok, error in
            guard ok else { call.reject(error?.localizedDescription ?? "beginCollection failed", "SAVE_FAILED"); return }
            let finish = {
                builder.addMetadata(meta) { _, _ in
                    builder.endCollection(withEnd: end) { ok, error in
                        guard ok else { call.reject(error?.localizedDescription ?? "endCollection failed", "SAVE_FAILED"); return }
                        builder.finishWorkout { workout, error in
                            if let workout = workout { call.resolve(["workoutId": workout.uuid.uuidString, "distanceSaved": withDistance]) }
                            else { call.reject(error?.localizedDescription ?? "finishWorkout failed", "SAVE_FAILED") }
                        }
                    }
                }
            }
            guard withDistance else { finish(); return }
            let sample = HKQuantitySample(
                type: self.distanceType,
                quantity: HKQuantity(unit: .meter(), doubleValue: meters),
                start: start, end: end,
                metadata: [
                    HKMetadataKeySyncIdentifier: "\(completionId):distance",
                    HKMetadataKeySyncVersion: NSNumber(value: 1),
                    Self.completionKey: completionId
                ])
            builder.add([sample]) { ok, error in
                guard ok else { call.reject(error?.localizedDescription ?? "distance failed", "SAVE_FAILED"); return }
                finish()
            }
        }
    }

    /// Deletes only what this app saved for that completion: the workout and its distance sample.
    @objc func deleteWorkout(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else { call.reject("Apple Health is not available", "UNAVAILABLE"); return }
        guard let completionId = call.getString("completionId"), !completionId.isEmpty else {
            call.reject("completionId is required", "BAD_ARGS"); return
        }
        var predicate = HKQuery.predicateForObjects(withMetadataKey: Self.completionKey, allowedValues: [completionId])
        if let raw = call.getString("workoutId"), let uuid = UUID(uuidString: raw) {
            predicate = NSCompoundPredicate(orPredicateWithSubpredicates: [predicate, HKQuery.predicateForObject(with: uuid)])
        }
        store.deleteObjects(of: HKObjectType.workoutType(), predicate: predicate) { ok, count, error in
            guard ok else { call.reject(error?.localizedDescription ?? "delete failed", "DELETE_FAILED"); return }
            let distancePredicate = HKQuery.predicateForObjects(withMetadataKey: Self.completionKey, allowedValues: [completionId])
            self.store.deleteObjects(of: self.distanceType, predicate: distancePredicate) { _, _, _ in
                call.resolve(["deleted": count])
            }
        }
    }
}
