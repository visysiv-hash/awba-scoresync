import { useEffect } from "react";

const REGISTRATION_URL = "https://www.revolutionise.com.au/awba/registration";

export default function Register() {
  useEffect(() => {
    window.open(REGISTRATION_URL, "_blank");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center p-4">
      <div className="text-center text-white space-y-3">
        <p className="text-lg font-semibold">Opening registration…</p>
        <p className="text-slate-300 text-sm">
          The registration form opens in a new tab. If it didn't open automatically,{" "}
          <a href={REGISTRATION_URL} target="_blank" rel="noopener noreferrer" className="underline text-white font-semibold">
            click here
          </a>
          .
        </p>
      </div>
    </div>
  );
}