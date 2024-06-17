const { Octokit } = require("@octokit/rest");
const github = require("@actions/github");

const octokit = new Octokit({
  auth: process.env.MY_CUSTOM_TOKEN,
});

const context = github.context;
const { owner, repo } = context.repo;
const prNumber = context.payload.pull_request.number;

async function run() {
  try {
    // Get the list of open pull requests to dev
    const { data: openPRs } = await octokit.pulls.list({
      owner,
      repo,
      state: "open",
      base: "dev",
    });

    for (const pr of openPRs) {
      if (pr.head.ref.startsWith("feature/*")) {
        // Check if this PR has a corresponding PR to main that is merged
        const { data: relatedPRs } = await octokit.pulls.list({
          owner,
          repo,
          head: pr.head.ref,
          base: "main",
          state: "closed",
        });

        const mergedPR = relatedPRs.find(pr => pr.merged_at);

        if (!mergedPR) {
          console.log(`PR #${pr.number} from feature branch has not been merged into main.`);
          console.log("Blocking new PRs to dev.");
          console.log(`::set-output name=result::failure`);
          process.exit(1);
        }
      }
    }

    console.log("All feature branch PRs to dev are merged into main. Proceeding.");
    console.log(`::set-output name=result::success`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

run();

