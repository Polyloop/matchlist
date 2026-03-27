import { requireOrg } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export default async function SettingsPage() {
  const { clerkOrgId } = await requireOrg();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Tabs defaultValue="organization">
        <TabsList>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Clerk Org ID</label>
                <Input value={clerkOrgId} readOnly className="mt-1" />
              </div>
              <p className="text-sm text-muted-foreground">
                Organization settings are managed through Clerk. Visit your Clerk
                dashboard to update organization details.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-keys" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>API Key Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                API keys are configured via environment variables. Update your
                <code className="mx-1 rounded bg-muted px-1">.env.local</code>
                file with the following keys:
              </p>
              <Separator />
              {[
                { name: "PROXYCURL_API_KEY", description: "LinkedIn enrichment via Proxycurl" },
                { name: "DOUBLE_THE_DONATION_API_KEY", description: "Matching gift eligibility checks" },
                { name: "ANTHROPIC_API_KEY", description: "Claude API for message generation" },
                { name: "RESEND_API_KEY", description: "Email sending via Resend" },
                { name: "CRONLET_API_KEY", description: "Background job orchestration via Cronlet" },
              ].map((key) => (
                <div key={key.name}>
                  <code className="text-sm font-medium">{key.name}</code>
                  <p className="text-sm text-muted-foreground">{key.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">From Address</label>
                <Input
                  value={process.env.RESEND_FROM_EMAIL || "Not configured"}
                  readOnly
                  className="mt-1"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Update the <code className="rounded bg-muted px-1">RESEND_FROM_EMAIL</code>
                environment variable to change the sender address.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
