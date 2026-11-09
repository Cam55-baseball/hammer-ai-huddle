import Foundation
import Capacitor
import DeviceCheck
import CryptoKit

/// Release 0 (owner-approved Nov 8, app_attest_v1): Apple App Attest for measurement saves.
/// generateKey → keyId; attestKey(keyId, challenge) → attestation (clientDataHash = SHA256(challenge));
/// generateAssertion(keyId, clientData) → assertion (clientDataHash = SHA256(clientData)).
/// Keys live in the Secure Enclave; nothing here stores data or touches purchases/sign-in.
@objc(AppAttestPlugin)
public class AppAttestPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppAttestPlugin"
    public let jsName = "AppAttest"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "generateKey", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "attestKey", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "generateAssertion", returnType: CAPPluginReturnPromise)
    ]

    private var service: DCAppAttestService { DCAppAttestService.shared }

    @objc func isSupported(_ call: CAPPluginCall) {
        call.resolve(["supported": service.isSupported])
    }

    @objc func generateKey(_ call: CAPPluginCall) {
        guard service.isSupported else { call.reject("App Attest is not supported on this device", "UNSUPPORTED"); return }
        service.generateKey { keyId, error in
            if let keyId = keyId { call.resolve(["keyId": keyId]) }
            else { call.reject(error?.localizedDescription ?? "generateKey failed", "GENERATE_FAILED") }
        }
    }

    @objc func attestKey(_ call: CAPPluginCall) {
        guard let keyId = call.getString("keyId"), let challenge = call.getString("challenge") else {
            call.reject("keyId and challenge are required", "BAD_ARGS"); return
        }
        let hash = Data(SHA256.hash(data: Data(challenge.utf8)))
        service.attestKey(keyId, clientDataHash: hash) { attestation, error in
            if let attestation = attestation { call.resolve(["attestation": attestation.base64EncodedString()]) }
            else { call.reject(error?.localizedDescription ?? "attestKey failed", "ATTEST_FAILED") }
        }
    }

    @objc func generateAssertion(_ call: CAPPluginCall) {
        guard let keyId = call.getString("keyId"), let clientData = call.getString("clientData") else {
            call.reject("keyId and clientData are required", "BAD_ARGS"); return
        }
        let hash = Data(SHA256.hash(data: Data(clientData.utf8)))
        service.generateAssertion(keyId, clientDataHash: hash) { assertion, error in
            if let assertion = assertion { call.resolve(["assertion": assertion.base64EncodedString()]) }
            else { call.reject(error?.localizedDescription ?? "generateAssertion failed", "ASSERT_FAILED") }
        }
    }
}
