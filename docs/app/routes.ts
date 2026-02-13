import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("docs/*", "docs/page.tsx"),
] satisfies RouteConfig;
