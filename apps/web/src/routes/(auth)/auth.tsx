import Layout from "@/modules/auth/layout/layout";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(auth)/auth")({
  component: Layout,
});
