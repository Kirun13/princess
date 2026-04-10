import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  signInMock,
  userFindUniqueMock,
  userFindFirstMock,
  userCreateMock,
  verificationTokenDeleteManyMock,
  verificationTokenCreateMock,
  sendVerificationEmailMock,
  bcryptCompareMock,
  bcryptHashMock,
} = vi.hoisted(() => ({
  signInMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  userFindFirstMock: vi.fn(),
  userCreateMock: vi.fn(),
  verificationTokenDeleteManyMock: vi.fn(),
  verificationTokenCreateMock: vi.fn(),
  sendVerificationEmailMock: vi.fn(),
  bcryptCompareMock: vi.fn(),
  bcryptHashMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  signIn: signInMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: userFindUniqueMock,
      findFirst: userFindFirstMock,
      create: userCreateMock,
    },
    verificationToken: {
      deleteMany: verificationTokenDeleteManyMock,
      create: verificationTokenCreateMock,
    },
  },
}));

vi.mock("@/lib/email", () => ({
  sendVerificationEmail: sendVerificationEmailMock,
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: bcryptCompareMock,
    hash: bcryptHashMock,
  },
}));

import { credentialsSignIn, signUp } from "@/app/auth/sign-in/actions";
import { AuthError } from "next-auth";

// ─── credentialsSignIn ────────────────────────────────────────────────────────

describe("credentialsSignIn", () => {
  beforeEach(() => {
    signInMock.mockReset();
  });

  it("returns no error and calls signIn when credentials are accepted (TC07)", async () => {
    // signIn throws NEXT_REDIRECT on success (Next.js redirect mechanism)
    // Simulate a successful redirect by throwing a non-AuthError
    const redirectError = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT",
    });
    signInMock.mockRejectedValue(redirectError);

    await expect(
      credentialsSignIn("valid@example.com", "correct-password")
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "valid@example.com",
      password: "correct-password",
      redirectTo: "/",
    });
  });

  it("returns an error when the password is wrong (TC08)", async () => {
    const authError = new AuthError("invalid credentials");
    // @ts-expect-error type property is not in the constructor signature
    authError.type = "CredentialsSignin";
    signInMock.mockRejectedValue(authError);

    const result = await credentialsSignIn("valid@example.com", "wrong-password");

    expect(result).toEqual({ error: "Invalid email or password." });
    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "valid@example.com",
      password: "wrong-password",
      redirectTo: "/",
    });
  });

  it("returns a generic error for unexpected AuthError types", async () => {
    const authError = new AuthError("something else");
    // @ts-expect-error
    authError.type = "OAuthCallbackError";
    signInMock.mockRejectedValue(authError);

    const result = await credentialsSignIn("user@example.com", "pass");

    expect(result).toEqual({ error: "Something went wrong. Please try again." });
  });
});

// ─── signUp ───────────────────────────────────────────────────────────────────

describe("signUp", () => {
  beforeEach(() => {
    signInMock.mockReset();
    userFindFirstMock.mockReset();
    userCreateMock.mockReset();
    verificationTokenDeleteManyMock.mockReset();
    verificationTokenCreateMock.mockReset();
    sendVerificationEmailMock.mockReset();
    bcryptHashMock.mockReset();
  });

  it("returns an error when the username is already taken (TC12-adjacent)", async () => {
    userFindFirstMock.mockResolvedValue({
      id: "existing-1",
      email: "other@example.com",
      username: "taken_name",
    });

    const result = await signUp("taken_name", "new@example.com", "password123");

    expect(result).toEqual({ error: "This username is already taken." });
    expect(userCreateMock).not.toHaveBeenCalled();
  });

  it("returns an error when the email is already registered", async () => {
    userFindFirstMock.mockResolvedValue({
      id: "existing-2",
      email: "dupe@example.com",
      username: "someone_else",
    });

    const result = await signUp("new_username", "dupe@example.com", "password123");

    expect(result).toEqual({ error: "An account with this email already exists." });
    expect(userCreateMock).not.toHaveBeenCalled();
  });

  it("creates the user and redirects when credentials are unique", async () => {
    userFindFirstMock.mockResolvedValue(null);
    bcryptHashMock.mockResolvedValue("hashed-password");
    userCreateMock.mockResolvedValue({ id: "new-user-1" });
    verificationTokenDeleteManyMock.mockResolvedValue({});
    verificationTokenCreateMock.mockResolvedValue({});
    sendVerificationEmailMock.mockResolvedValue(undefined);

    // signIn throws NEXT_REDIRECT on successful sign-in after creation
    const redirectError = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT",
    });
    signInMock.mockRejectedValue(redirectError);

    await expect(
      signUp("fresh_user", "fresh@example.com", "securepass")
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(bcryptHashMock).toHaveBeenCalledWith("securepass", 12);
    expect(userCreateMock).toHaveBeenCalledWith({
      data: { username: "fresh_user", email: "fresh@example.com", passwordHash: "hashed-password" },
    });
  });
});
