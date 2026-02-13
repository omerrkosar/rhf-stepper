import { Link } from "react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { baseOptions } from "~/lib/layout.shared";

export default function HomePage() {
  return (
    <HomeLayout {...baseOptions()}>
      <div className="flex flex-col justify-center text-center flex-1 min-h-[60vh]">
        <h1 className="text-2xl font-bold mb-4">rhf-stepper</h1>
        <p className="text-lg text-muted-foreground mb-6">
          A lightweight multi-step form helper for react-hook-form
        </p>
        <p>
          <Link to="/docs" className="font-medium underline">
            Get Started
          </Link>
        </p>
      </div>
    </HomeLayout>
  );
}
