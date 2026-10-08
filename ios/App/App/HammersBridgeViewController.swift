import UIKit
import Capacitor

/// Registers the app's own native plugins (not installed from npm).
class HammersBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(StorefrontPlugin())
    }
}
