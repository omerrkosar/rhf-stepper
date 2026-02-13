import { useParams } from "react-router";
import { source } from "~/lib/source";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import {
  DocsPage,
  DocsBody,
  DocsDescription,
  DocsTitle,
} from "fumadocs-ui/page";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { baseOptions } from "~/lib/layout.shared";

export default function Page() {
  const params = useParams();
  const slug = params["*"]?.split("/").filter(Boolean);
  const page = source.getPage(slug);

  if (!page) {
    return (
      <DocsLayout tree={source.pageTree} {...baseOptions()}>
        <DocsPage>
          <DocsTitle>Not Found</DocsTitle>
          <DocsBody>
            <p>The page you are looking for does not exist.</p>
          </DocsBody>
        </DocsPage>
      </DocsLayout>
    );
  }

  const MDX = page.data.body;

  return (
    <DocsLayout tree={source.pageTree} {...baseOptions()}>
      <DocsPage toc={page.data.toc}>
        <DocsTitle>{page.data.title}</DocsTitle>
        <DocsDescription>{page.data.description}</DocsDescription>
        <DocsBody>
          <MDX components={{ ...defaultMdxComponents }} />
        </DocsBody>
      </DocsPage>
    </DocsLayout>
  );
}
