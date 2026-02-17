import SignInPage from "@/modules/auth/pages/sign-in-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(auth)/auth/sign-in")({
  component: SignInPage,
});
