import { useNavigate } from "@tanstack/react-router";
import { FileQuestion } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ef-design-system";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { FunctionComponent } from "@/common/types";

export const NotFound = (): FunctionComponent => {
	const { t } = useTranslation();
	const navigate = useNavigate();

	return (
		<div className="flex h-screen w-screen items-center justify-center bg-background px-4">
			<Card className="w-full max-w-sm text-center">
				<CardHeader>
					<div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
						<FileQuestion className="size-6 text-muted-foreground" />
					</div>
					<CardTitle className="text-2xl">
						{t("notFound.title")}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">
						{t("notFound.description")}
					</p>
				</CardContent>
				<CardFooter className="justify-center">
					<Button
						variant="outline"
						onClick={() => navigate({ to: "/" })}
					>
						{t("notFound.backToHome")}
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
};
