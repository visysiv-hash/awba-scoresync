import { useEffect } from "react";

const REGISTRATION_URL = "https://www.revolutionise.com.au/awba/registration";

export default function Register() {
  useEffect(() => {
    window.location.href = REGISTRATION_URL;
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center p-4">
      <div className="text-center text-white space-y-2">
        <p className="text-lg font-semibold">Redirecting to registration…</p>
        <p className="text-slate-300 text-sm">
          If you are not redirected automatically,{" "}
          <a href={REGISTRATION_URL} className="underline text-white">
            click here
          </a>
          .
        </p>
      </div>
    </div>
  );
}