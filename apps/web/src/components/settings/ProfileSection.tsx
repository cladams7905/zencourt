"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card } from "@web/src/components/ui/card";
import { Input } from "@web/src/components/ui/input";
import { Label } from "@web/src/components/ui/label";
import { Button } from "@web/src/components/ui/button";
import {
  User,
  Building2,
  Briefcase,
  Image as ImageIcon,
  Upload
} from "lucide-react";
import { updateUserProfile } from "@web/src/server/actions/db/userAdditional";
import { toast } from "sonner";

interface ProfileSectionProps {
  userId: string;
  initialData: {
    agentName: string;
    brokerageName: string;
    agentTitle: string | null;
    avatarImageUrl: string | null;
    brokerLogoUrl: string | null;
  };
}

export function ProfileSection({ userId, initialData }: ProfileSectionProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    agentName: initialData.agentName || "",
    brokerageName: initialData.brokerageName || "",
    agentTitle: initialData.agentTitle || "",
    avatarImageUrl: initialData.avatarImageUrl || "",
    brokerLogoUrl: initialData.brokerLogoUrl || ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateUserProfile(userId, {
        agentName: formData.agentName,
        brokerageName: formData.brokerageName,
        agentTitle: formData.agentTitle || null,
        avatarImageUrl: formData.avatarImageUrl || null,
        brokerLogoUrl: formData.brokerLogoUrl || null
      });

      toast.success("Profile updated successfully!");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid =
    formData.agentName.trim() !== "" && formData.brokerageName.trim() !== "";

  return (
    <section id="profile" className="scroll-mt-24">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <User className="h-6 w-6 text-amber-600" />
          Complete Your Profile
        </h2>
        <p className="text-gray-600 mt-1">
          Add your name and brokerage information to personalize your experience
        </p>
      </div>

      <Card className="p-8 bg-gradient-to-br from-white to-gray-50/50 border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Agent Name */}
            <div className="space-y-2">
              <Label
                htmlFor="agentName"
                className="text-gray-900 font-medium flex items-center gap-2"
              >
                <User className="h-4 w-4 text-gray-500" />
                Agent Name *
              </Label>
              <Input
                id="agentName"
                value={formData.agentName}
                onChange={(e) =>
                  setFormData({ ...formData, agentName: e.target.value })
                }
                placeholder="Alex Rivera"
                required
                className="bg-white"
              />
            </div>

            {/* Brokerage Name */}
            <div className="space-y-2">
              <Label
                htmlFor="brokerageName"
                className="text-gray-900 font-medium flex items-center gap-2"
              >
                <Building2 className="h-4 w-4 text-gray-500" />
                Brokerage Name *
              </Label>
              <Input
                id="brokerageName"
                value={formData.brokerageName}
                onChange={(e) =>
                  setFormData({ ...formData, brokerageName: e.target.value })
                }
                placeholder="Zencourt Realty"
                required
                className="bg-white"
              />
            </div>

            {/* Agent Title */}
            <div className="space-y-2">
              <Label
                htmlFor="agentTitle"
                className="text-gray-900 font-medium flex items-center gap-2"
              >
                <Briefcase className="h-4 w-4 text-gray-500" />
                Title (Optional)
              </Label>
              <Input
                id="agentTitle"
                value={formData.agentTitle}
                onChange={(e) =>
                  setFormData({ ...formData, agentTitle: e.target.value })
                }
                placeholder="Realtor, Broker, etc."
                className="bg-white"
              />
            </div>
          </div>

          {/* Image Upload Section */}
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-gray-500" />
              Images (Optional)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile Image */}
              <div className="space-y-2">
                <Label htmlFor="avatarImageUrl" className="text-gray-700">
                  Profile Image URL
                </Label>
                <Input
                  id="avatarImageUrl"
                  value={formData.avatarImageUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, avatarImageUrl: e.target.value })
                  }
                  placeholder="https://example.com/profile.jpg"
                  className="bg-white"
                />
                {formData.avatarImageUrl && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={formData.avatarImageUrl}
                      alt="Profile preview"
                      className="w-full h-32 object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Broker Logo */}
              <div className="space-y-2">
                <Label htmlFor="brokerLogoUrl" className="text-gray-700">
                  Brokerage Logo URL
                </Label>
                <Input
                  id="brokerLogoUrl"
                  value={formData.brokerLogoUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, brokerLogoUrl: e.target.value })
                  }
                  placeholder="https://example.com/logo.png"
                  className="bg-white"
                />
                {formData.brokerLogoUrl && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 bg-white p-4">
                    <img
                      src={formData.brokerLogoUrl}
                      alt="Logo preview"
                      className="w-full h-20 object-contain"
                    />
                  </div>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-500 mt-3">
              For now, provide direct URLs to your images. File upload coming
              soon.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-gray-600">
              * Required fields to mark profile as complete
            </p>
            <Button
              type="submit"
              disabled={isLoading || !isFormValid}
              className="bg-amber-600 hover:bg-amber-700 text-white px-8"
            >
              {isLoading ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
