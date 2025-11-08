import { User, Bell, CreditCard, Shield } from "lucide-react";

export function SettingsView() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl mb-2">Settings</h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          Manage your account and preferences
        </p>
      </div>

      <div className="max-w-3xl space-y-4 sm:space-y-6">
        {/* Profile Section */}
        <div className="bg-white rounded-xl border border-border p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="p-2 sm:p-3 rounded-xl bg-secondary">
              <User size={20} className="sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-base sm:text-lg">Profile</h3>
          </div>

          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2">First Name</label>
                <input
                  type="text"
                  defaultValue="Sarah"
                  className="w-full px-4 py-2 border border-border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Last Name</label>
                <input
                  type="text"
                  defaultValue="Johnson"
                  className="w-full px-4 py-2 border border-border rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2">Email</label>
              <input
                type="email"
                defaultValue="sarah.johnson@realestate.com"
                className="w-full px-4 py-2 border border-border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">Agency</label>
              <input
                type="text"
                defaultValue="Luxury Homes Realty"
                className="w-full px-4 py-2 border border-border rounded-lg"
              />
            </div>

            <button className="px-6 py-2 bg-black text-white rounded-lg hover:bg-black/90 transition-colors">
              Save Changes
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl border border-border p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="p-2 sm:p-3 rounded-xl bg-secondary">
              <Bell size={20} className="sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-base sm:text-lg">Notifications</h3>
          </div>

          <div className="space-y-4">
            {[
              { label: "Video rendering complete", enabled: true },
              { label: "Social media post published", enabled: true },
              { label: "New features and updates", enabled: false },
              { label: "Weekly usage reports", enabled: true },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between py-2 gap-4">
                <span className="text-sm sm:text-base">{item.label}</span>
                <button
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    item.enabled ? "bg-black" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      item.enabled ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Billing */}
        <div className="bg-white rounded-xl border border-border p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="p-2 sm:p-3 rounded-xl bg-secondary">
              <CreditCard size={20} className="sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-base sm:text-lg">Billing</h3>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg gap-3">
              <div>
                <h4 className="mb-1 text-sm sm:text-base">Professional Plan</h4>
                <p className="text-sm text-muted-foreground">
                  $49/month • Up to 50 videos
                </p>
              </div>
              <button className="px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors text-sm whitespace-nowrap">
                Change Plan
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg gap-3">
              <div>
                <h4 className="mb-1 text-sm sm:text-base">Payment Method</h4>
                <p className="text-sm text-muted-foreground">
                  •••• •••• •••• 4242
                </p>
              </div>
              <button className="px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors text-sm whitespace-nowrap">
                Update
              </button>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-xl border border-border p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="p-2 sm:p-3 rounded-xl bg-secondary">
              <Shield size={20} className="sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-base sm:text-lg">Security</h3>
          </div>

          <div className="space-y-4">
            <button className="w-full text-left px-4 py-3 border border-border rounded-lg hover:bg-secondary transition-colors text-sm sm:text-base">
              Change Password
            </button>
            <button className="w-full text-left px-4 py-3 border border-border rounded-lg hover:bg-secondary transition-colors text-sm sm:text-base">
              Enable Two-Factor Authentication
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
