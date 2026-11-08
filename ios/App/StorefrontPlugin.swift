import Foundation
import Capacitor
import StoreKit

/// Returns the App Store storefront country (ISO alpha-3, e.g. "USA") so the
/// web layer can show the "Subscribe on our website" link ONLY on the US
/// storefront. Unknown → null → the web layer hides all purchase UI.
@objc(StorefrontPlugin)
public class StorefrontPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StorefrontPlugin"
    public let jsName = "Storefront"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getCountry", returnType: CAPPluginReturnPromise)
    ]

    @objc func getCountry(_ call: CAPPluginCall) {
        Task {
            let storefront = await Storefront.current
            if let code = storefront?.countryCode {
                call.resolve(["countryCode": code])
            } else {
                call.resolve(["countryCode": NSNull()])
            }
        }
    }
}
