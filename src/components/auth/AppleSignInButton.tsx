import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { describeOAuthError } from "@/lib/auth/appleIdentity";

interface AppleSignInButtonProps {
  /** Same-origin relative path to resume after the round trip, if any. */
  redirectTarget?: string | null;
  disabled?: boolean;
}

/**
 * Apple requires its own button styling: black background, white Apple mark,
 * the exact wording "Sign in with Apple", and equal prominence with any other
 * third-party sign-in option. Those fixed colors are Apple brand requirements,
 * which is why this is the one button that does not follow the theme tokens.
 */
export const AppleSignInButton = ({ redirectTarget, disabled }: AppleSignInButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const callback = new URL("/auth/callback", window.location.origin);
      if (redirectTarget) callback.searchParams.set("redirect", redirectTarget);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: callback.toString(),
          scopes: "name email",
        },
      });

      if (error) {
        toast({
          title: "Couldn't sign in with Apple",
          description: describeOAuthError("apple", error),
          variant: "destructive",
        });
        setIsLoading(false);
      }
      // On success the browser navigates to Apple; leave the button busy.
    } catch (error) {
      toast({
        title: "Couldn't sign in with Apple",
        description: describeOAuthError("apple", error),
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      aria-label="Sign in with Apple"
      className="w-full h-11 rounded-md bg-[#000000] text-[#ffffff] font-medium text-base flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 384 512"
        className="h-5 w-5 fill-current"
        focusable="false"
      >
        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
      </svg>
      {isLoading ? "Opening Apple…" : "Sign in with Apple"}
    </button>
  );
};

export default AppleSignInButton;
