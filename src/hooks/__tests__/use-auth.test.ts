import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "new-project-id" });
  });

  describe("initial state", () => {
    test("isLoading is false initially", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });

    test("exposes signIn, signUp, and isLoading", () => {
      const { result } = renderHook(() => useAuth());
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
      expect(typeof result.current.isLoading).toBe("boolean");
    });
  });

  describe("signIn", () => {
    test("sets isLoading to true while in-flight and false after", async () => {
      let resolveSignIn!: (v: any) => void;
      (signInAction as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise((res) => { resolveSignIn = res; })
      );

      const { result } = renderHook(() => useAuth());

      act(() => { result.current.signIn("user@example.com", "password123"); });
      expect(result.current.isLoading).toBe(true);

      await act(async () => { resolveSignIn({ success: false, error: "bad creds" }); });
      expect(result.current.isLoading).toBe(false);
    });

    test("returns the result from signInAction on success", async () => {
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());
      let returnValue: any;

      await act(async () => {
        returnValue = await result.current.signIn("user@example.com", "password123");
      });

      expect(returnValue).toEqual({ success: true });
    });

    test("returns error result from signInAction on failure", async () => {
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const { result } = renderHook(() => useAuth());
      let returnValue: any;

      await act(async () => {
        returnValue = await result.current.signIn("user@example.com", "wrongpass");
      });

      expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
    });

    test("calls signInAction with correct arguments", async () => {
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@test.com", "mypassword");
      });

      expect(signInAction).toHaveBeenCalledWith("test@test.com", "mypassword");
    });

    test("does not call handlePostSignIn when signIn fails", async () => {
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "wrongpass");
      });

      expect(getProjects).not.toHaveBeenCalled();
      expect(createProject).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("resets isLoading to false even when signInAction throws", async () => {
      (signInAction as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signIn("user@example.com", "password123");
        } catch {
          // expected
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    test("sets isLoading to true while in-flight and false after", async () => {
      let resolveSignUp!: (v: any) => void;
      (signUpAction as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise((res) => { resolveSignUp = res; })
      );

      const { result } = renderHook(() => useAuth());

      act(() => { result.current.signUp("new@example.com", "password123"); });
      expect(result.current.isLoading).toBe(true);

      await act(async () => { resolveSignUp({ success: false }); });
      expect(result.current.isLoading).toBe(false);
    });

    test("returns the result from signUpAction on success", async () => {
      (signUpAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());
      let returnValue: any;

      await act(async () => {
        returnValue = await result.current.signUp("new@example.com", "password123");
      });

      expect(returnValue).toEqual({ success: true });
    });

    test("returns error result when signUpAction fails", async () => {
      (signUpAction as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "Email already registered",
      });

      const { result } = renderHook(() => useAuth());
      let returnValue: any;

      await act(async () => {
        returnValue = await result.current.signUp("existing@example.com", "password123");
      });

      expect(returnValue).toEqual({ success: false, error: "Email already registered" });
    });

    test("calls signUpAction with correct arguments", async () => {
      (signUpAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@test.com", "securepass");
      });

      expect(signUpAction).toHaveBeenCalledWith("new@test.com", "securepass");
    });

    test("does not call handlePostSignIn when signUp fails", async () => {
      (signUpAction as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "Email already registered",
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("existing@example.com", "password123");
      });

      expect(getProjects).not.toHaveBeenCalled();
      expect(createProject).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("resets isLoading to false even when signUpAction throws", async () => {
      (signUpAction as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signUp("new@example.com", "password123");
        } catch {
          // expected
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("handlePostSignIn — anonymous work present", () => {
    const anonWork = {
      messages: [{ id: "1", role: "user", content: "Make a button" }],
      fileSystemData: { "/App.jsx": { type: "file", content: "export default () => <button/>" } },
    };

    beforeEach(() => {
      (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(anonWork);
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "anon-project-id" });
    });

    test("creates project with anonymous work data", async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: anonWork.messages,
          data: anonWork.fileSystemData,
        })
      );
    });

    test("project name includes a time string", async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      const callArg = (createProject as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.name).toMatch(/Design from /);
    });

    test("clears anonymous work after project creation", async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(clearAnonWork).toHaveBeenCalledOnce();
    });

    test("redirects to the new project", async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
    });

    test("does not call getProjects when anon work is present", async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(getProjects).not.toHaveBeenCalled();
    });
  });

  describe("handlePostSignIn — anonymous work with empty messages", () => {
    beforeEach(() => {
      (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue({
        messages: [],
        fileSystemData: {},
      });
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
    });

    test("falls through to getProjects when anon messages are empty", async () => {
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "existing-project" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(getProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/existing-project");
    });
  });

  describe("handlePostSignIn — no anonymous work", () => {
    beforeEach(() => {
      (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
    });

    test("redirects to most recent project when projects exist", async () => {
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "recent-project" },
        { id: "older-project" },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/recent-project");
    });

    test("creates a new project and redirects when no projects exist", async () => {
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "fresh-project" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [],
          data: {},
        })
      );
      expect(mockPush).toHaveBeenCalledWith("/fresh-project");
    });

    test("new project name matches 'New Design #<number>' pattern", async () => {
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "fresh-project" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      const callArg = (createProject as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.name).toMatch(/^New Design #\d+$/);
    });

    test("does not create a project when existing projects are found", async () => {
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "existing" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(createProject).not.toHaveBeenCalled();
    });

    test("signUp also triggers handlePostSignIn on success", async () => {
      (signUpAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "my-project" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "password123");
      });

      expect(getProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/my-project");
    });
  });
});
