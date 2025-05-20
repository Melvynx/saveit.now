import { auth } from "@/lib/auth";
import { getUser } from "@/lib/auth-session";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { headers } from "next/headers";

export default async function AuthPage() {
  const user = await getUser();
  const accounts = await auth.api.listUserAccounts({
    headers: await headers(),
  });
  const sessions = await auth.api.listSessions({
    headers: await headers(),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Auth</CardTitle>
        </CardHeader>
        <CardContent>
          <pre>{JSON.stringify(user, null, 2)}</pre>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-muted-foreground">No connected accounts</p>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => (
                <div key={account.id} className="rounded-md border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-medium">{account.provider}</h3>
                    <span className="text-muted-foreground text-xs">
                      ID: {account.accountId}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Created:</span>{" "}
                      {new Date(account.createdAt).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Updated:</span>{" "}
                      {new Date(account.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  {account.scopes.length > 0 && (
                    <div className="mt-2">
                      <span className="text-muted-foreground text-xs">
                        Scopes:
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {account.scopes.map((scope) => (
                          <span
                            key={scope}
                            className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground">No active sessions</p>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div key={session.id} className="rounded-md border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-medium">
                      {session.userAgent || "Unknown Device"}
                    </h3>
                    <span className="text-muted-foreground text-xs">
                      IP: {session.ipAddress || "Unknown"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Created:</span>{" "}
                      {new Date(session.createdAt).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Expires:</span>{" "}
                      {new Date(session.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
