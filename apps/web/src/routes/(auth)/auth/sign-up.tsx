import SignupPage from "@/modules/auth/pages/sign-up-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(auth)/auth/sign-up")({
  component: SignupPage,
});
