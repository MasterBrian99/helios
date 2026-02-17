import * as z from "zod";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import PasswordInput from "@/components/password-input";
import { Link } from "@tanstack/react-router";

const schema = z.object({
  email: z.email({
    error: "Email is invalid",
  }),
  password: z
    .string({
      error: "Password is required",
    })
    .min(1, "Password is required"),
});

const SignInPage = () => {
  const form = useForm<z.infer<typeof schema>>({
    resolver: standardSchemaResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  async function onSubmit(values: z.infer<typeof schema>) {
    console.log(values);
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-bold">Welcome Back !</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Login to your account to continue
        </p>
      </div>
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
        <FieldLabel htmlFor="password">Password</FieldLabel>

        <PasswordInput
          id="password"
          placeholder="******"
          {...form.register("password")}
        />
        <FieldError>{form.formState.errors.password?.message}</FieldError>
      </Field>
      <Field>
        <Button type="submit">Sign in</Button>
        <FieldDescription className="px-6 text-center">
          Don't have an account? <Link to="/auth/sign-up">Sign up</Link>
        </FieldDescription>
      </Field>
    </form>
  );
};

export default SignInPage;
