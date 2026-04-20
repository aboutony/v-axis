import { lazy } from "react";

const TaxonomyPage = lazy(() => import("./TaxonomyPageContent"));
export default TaxonomyPage;

// Create the actual content file
import fs from "fs";
const content = `import React from "react";

const TaxonomyPageContent = () => {
  return (
    <div>
      <h1>Taxonomy Configuration</h1>
      <p>Taxonomy page content</p>
    </div>
  );
};

export default TaxonomyPageContent;
`;
fs.writeFileSync("apps/web/src/pages/TaxonomyPageContent.tsx", content);
