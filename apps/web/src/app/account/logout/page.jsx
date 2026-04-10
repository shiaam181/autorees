import useAuth from "@/utils/useAuth";
import { useEffect } from "react";

function MainComponent() {
  const { signOut } = useAuth();

  useEffect(() => {
    signOut({
      callbackUrl: "/account/signin",
      redirect: true,
    });
  }, [signOut]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0a0a0a] text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
        <p className="text-gray-400">Signing you out...</p>
      </div>
    </div>
  );
}

export default MainComponent;
