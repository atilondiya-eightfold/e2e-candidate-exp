import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import type { ReactElement } from "react";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useAuthSession } from "@/features/auth";

export const Route = createFileRoute("/")({ component: Welcome });

interface StatusRow {
	ok: boolean;
	label: string;
	detail: string;
}

function StatusItem({ ok, label, detail }: StatusRow): ReactElement {
	const Icon = ok ? CheckCircle2 : AlertCircle;
	const tone = ok ? "text-success" : "text-warning";
	return (
		<li className="flex items-start gap-3">
			<Icon className={`mt-0.5 size-5 shrink-0 ${tone}`} />
			<div>
				<p className="font-medium">{label}</p>
				<p className="text-muted-foreground">{detail}</p>
			</div>
		</li>
	);
}

function Welcome(): ReactElement {
	const { data: session, isLoading, isError } = useAuthSession();
	const email = session?.email ?? null;
	const isDevFallback = email === "dev@example.com";

	const sessionRow: StatusRow = isLoading
		? { ok: false, label: "Auth session", detail: "Loading…" }
		: isError || !email
			? {
					ok: false,
					label: "Auth session",
					detail: "Backend not reachable, or no session cookie + no dev fallback set.",
				}
			: isDevFallback
				? {
						ok: true,
						label: "Auth session — dev fallback",
						detail: `Signed in as ${email}. Set TF_SESSION_SECRET + TF_SESSION_SALT in .env to verify real parent cookies.`,
					}
				: {
						ok: true,
						label: "Auth session — cookie verified",
						detail: `Signed in as ${email}.`,
					};

	const proxyRow: StatusRow = {
		ok: false,
		label: "Eightfold API proxy",
		detail:
			"Set EF_OAUTH_CLIENT_ID + EF_OAUTH_CLIENT_SECRET in .env to enable upstream calls. Until then, the BFF proxy returns 502 and the 40 prebuilt entity hooks won't resolve.",
	};

	return (
		<div className="mx-auto max-w-3xl p-8">
			<div className="mb-6">
				<h1 className="text-3xl font-bold">Headless Boilerplate</h1>
				<p className="mt-2 text-muted-foreground">
					BFF-shape starting point. Build your product on top.
				</p>
			</div>

			<Card className="mb-6">
				<CardHeader>
					<CardTitle>Setup status</CardTitle>
					<CardDescription>
						Quick check of the two auth boundaries. Both green when your{" "}
						<code>.env</code> is wired up.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ul className="flex flex-col gap-4">
						<StatusItem {...sessionRow} />
						<StatusItem {...proxyRow} />
					</ul>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Next steps</CardTitle>
				</CardHeader>
				<CardContent>
					<ul className="flex flex-col gap-3">
						<li className="flex items-start gap-3">
							<ArrowRight className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
							<div>
								<p className="font-medium">Replace this page</p>
								<p className="text-muted-foreground">
									Edit <code>src/routes/index.tsx</code> with your landing
									page.
								</p>
							</div>
						</li>
						<li className="flex items-start gap-3">
							<ArrowRight className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
							<div>
								<p className="font-medium">Wire parent cookie session</p>
								<p className="text-muted-foreground">
									Set <code>TF_SESSION_SECRET</code> +{" "}
									<code>TF_SESSION_SALT</code> in <code>.env</code> (repo root).
									Parser at{" "}
									<code>backend/app/core/security_tf_cookie.py</code>.
								</p>
							</div>
						</li>
						<li className="flex items-start gap-3">
							<ArrowRight className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
							<div>
								<p className="font-medium">Wire OAuth Bearer JWT (BFF → EF)</p>
								<p className="text-muted-foreground">
									Set <code>EF_OAUTH_CLIENT_ID</code> +{" "}
									<code>EF_OAUTH_CLIENT_SECRET</code> in <code>.env</code> (repo
									root). Token cache at{" "}
									<code>backend/app/clients/ef_oauth.py</code>.
								</p>
							</div>
						</li>
						<li className="flex items-start gap-3">
							<ArrowRight className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
							<div>
								<p className="font-medium">Use the entity hooks</p>
								<p className="text-muted-foreground">
									40 generated hooks live under{" "}
									<code>src/features/eightfold-api/hooks/</code>. Import them
									from <code>@/features/eightfold-api</code>.
								</p>
							</div>
						</li>
					</ul>
				</CardContent>
			</Card>
		</div>
	);
}
