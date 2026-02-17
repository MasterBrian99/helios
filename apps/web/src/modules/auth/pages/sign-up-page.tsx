import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { z } from "zod";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useForm } from "react-hook-form";
import PasswordInput from "@/components/password-input";
import { Link } from "@tanstack/react-router";
const schema = z.object({
  email: z.email(),
  password: z
    .string({
      error: "Password is required",
    })
    .min(6, {
      error: "Password must be at least 6 characters",
    })
    .max(33, {
      error: "Password must be less than 33 characters",
    })
    .refine((val) => /[A-Z]/.test(val), {
      error: "Password must contain at least one Uppercase letter",
    })
    .refine((val) => /[a-z]/.test(val), {
      error: "Password must contain at least one lowercase letter",
    })
    .refine((val) => /[0-9]/.test(val), {
      error: "Password must contain at least one number",
    })
    .refine((val) => /[!@#$%^&*(),.?":{}|<>]/.test(val), {
      error: "Password must contain at least one special character",
    }),
  username: z
    .string({
      error: "Username is required",
    })
    .min(8, {
      error: "Username must be at least 8 characters",
    })
    .max(20, {
      error: "Username must be less than 20 characters",
    }),
  name: z
    .string({
      error: "Name is required",
    })
    .min(1, {
      error: "Name is required",
    }),
});
export default function SignupPage() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: standardSchemaResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      username: "",
    },
  });
  async function onSubmit(values: z.infer<typeof schema>) {
    console.log("values", values);
  }
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Fill in the form below to create your account
        </p>
      </div>
      <Field>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <Input id="name" placeholder="brian mc" {...form.register("name")} />
        <FieldError>{form.formState.errors.name?.message}</FieldError>
      </Field>
      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          placeholder="me@gmail.com"
          {...form.register("email")}
        />
        <FieldError>{form.formState.errors.email?.message}</FieldError>
      </Field>
      <Field>
        <FieldLabel htmlFor="username">Username</FieldLabel>
        <Input
          id="username"
          placeholder="username"
          {...form.register("username")}
        />
        <FieldError>{form.formState.errors.username?.message}</FieldError>
      </Field>
      <Field>
        <FieldLabel htmlFor="password">Password</FieldLabel>

        <PasswordInput
          id="password"
          placeholder="******"
          {...form.register("password")}
        />
        <FieldError>{form.formState.errors.password?.message}</FieldError>
      </Field>
      <Field>
        <Button type="submit">Sign up</Button>
        <FieldDescription className="px-6 text-center">
          Already have an account? <Link to="/auth/sign-in">Sign in</Link>
        </FieldDescription>
      </Field>
    </form>
  );
}
