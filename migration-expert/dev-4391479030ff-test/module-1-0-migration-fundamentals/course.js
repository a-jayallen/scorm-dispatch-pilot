window.COURSE = {
 "number": "1.0",
 "title": "Module 1.0: Migration Fundamentals",
 "guideId": "01a0eed0-52db-7a51-ba0d-3822d844747c",
 "sections": [
  {
   "title": "Foundations",
   "pages": [
    {
     "id": "01a0f875-ba15-7c28-ad2c-9a2bdb2001b6",
     "title": "Migration Overview",
     "kind": "content",
     "blocks": [
      {
       "t": "html",
       "html": "<h3>Migration Overview</h3>\n<p>A Mattermost migration is a data pipeline with four predictable stages: <strong>prepare</strong>, <strong>export</strong>, <strong>transform</strong>, <strong>import</strong>, and <strong>validate</strong>. Regardless of the source (Slack or RocketChat) these stages always apply.</p>\n<p>The central tool in every migration is <a href=\"https://github.com/mattermost/mmetl\" target=\"_blank\" rel=\"noopener\"><strong>mmetl</strong></a>, the Mattermost Extract, Transform, Load (ETL) tool. It accepts an export from either platform, producing two outputs: a JSONL bulk import file and an attachments directory. Both are packaged into a zip archive and ingested by Mattermost through <code>mmctl import</code>.</p>\n<p>Understanding this pipeline before starting any configuration is essential to avoid common mistakes, such as skipping validation or misjudging the migration scope.</p>"
      },
      {
       "t": "html",
       "html": "<div class=\"stages\" role=\"img\" aria-label=\"5 stages: Prepare, Export, Transform, Import, Validate\"><div class=\"stage\"><span>Stage 1</span><strong>Prepare</strong></div><div class=\"stage\"><span>Stage 2</span><strong>Export</strong></div><div class=\"stage\"><span>Stage 3</span><strong>Transform</strong></div><div class=\"stage\"><span>Stage 4</span><strong>Import</strong></div><div class=\"stage\"><span>Stage 5</span><strong>Validate</strong></div></div>"
      },
      {
       "t": "accordion",
       "items": [
        {
         "title": "1️⃣ Prepare",
         "html": "<p>Before any export begins, scope the migration and prepare the destination Mattermost environment. This includes deciding on team and channel structure, mapping user identities, planning attachment storage, and adjusting Mattermost server settings that would otherwise block or silently break the import.</p>\n<p>Skipping this stage is the most common reason a first migration attempt needs a second pass.</p>"
        },
        {
         "title": "2️⃣ Export",
         "html": "<p>Pull the source platform’s data out in its native format. For Slack, export a zip archive of JSON files through Slack’s workspace settings. For RocketChat, perform a <code>mongodump</code> of the MongoDB database. Note that neither tool exports data in Mattermost format; the export is raw source data, and the structure varies between platforms. The actual conversion to Mattermost-compatible data happens in the next stage.</p>"
        },
        {
         "title": "3️⃣ Transform",
         "html": "<p>Run <code>mmetl</code> against the export to convert it into the Mattermost Bulk Import format: a JSONL file where each line is a structured object representing a version, team, channel, user, post, or direct message.</p>\n<p><code>mmetl</code> also produces a <code>data/</code> directory for attachments and logs a summary at the end of a successful run, including counts for users, channels, posts, and attachments. Record these numbers for use in the validation stage.</p>\n<p>Always perform a <code>--dry-run</code> first to detect errors before doing the full transform.</p>"
        },
        {
         "title": "4️⃣ Import",
         "html": "<p>Package the JSONL file and <code>data/</code> directory into a zip archive. Upload it to Mattermost using <code>mmctl import upload</code>, then trigger processing with <code>mmctl import process</code>. The import runs as a background job—monitor it with <code>mmctl import job show</code>.</p>\n<p>The process is idempotent, so rerunning the same file does not duplicate posts, making it safe to retry after fixing a failed job.</p>"
        },
        {
         "title": "5️⃣ Validate",
         "html": "<p>Check the import job to confirm the job completed and review any errors. Compare the post-import state in Mattermost with the summary counts. Log in as users to check channel history, threads, reactions, and attachments.</p>\n<p>In some cases unread message counts need to be reset with a PostgreSQL query.</p>\n<p>Only after a successful validation should you proceed to a production cutover and alert users.</p>"
        }
       ]
      }
     ]
    },
    {
     "id": "01a0f876-45c7-7dd4-9af3-31f254c0a1e6",
     "title": "Preparations",
     "kind": "content",
     "blocks": [
      {
       "t": "html",
       "html": "<h3>Server Preparations</h3>\n<p>Preparing a Mattermost server for import is mostly about reducing risk before someone else's historical data lands on it. The decision that matters most happens before you touch a single setting: where the import goes.</p>\n<p>A fresh server or a brand new team gives the import nothing to collide with. An existing, actively used server gives it plenty, since the import can overwrite recent posts and channel membership on matching identity fields. Prefer a fresh target for every trial and production run.</p>\n<p>Beyond that decision, a handful of default settings will still block the import or make it behave incorrectly if left unchanged. These exist for good reasons in production, protecting against accidental data exposure and resource exhaustion, so you override them temporarily for the migration and restore them afterward.</p>"
      },
      {
       "t": "accordion",
       "items": [
        {
         "title": "👥 User and Team limits",
         "html": "<p>Mattermost enforces per-team limits on the number of channels and users. The defaults are low enough that a typical migration will exceed them and produce import errors partway through.</p>\n<p>Before importing, the destination Mattermost team must exist and be set to Public visibility. <code>mmetl</code> maps all source data to a single Mattermost team by name. If the team does not exist, the import fails at the team resolution step.</p>\n<p>Once created, set <code>TeamSettings.MaxChannelsPerTeam</code> and <code>TeamSettings.MaxUsersPerTeam</code> to values well above what the source export contains. You can find these counts in the <code>mmetl</code> transform summary. Restore the limits after import and validation are complete.</p>"
        },
        {
         "title": "✉️ Email and authentication settings",
         "html": "<p>The import process creates user accounts from the emails and usernames in the export. Email verification and SSO enforcement can block this process.</p>\n<p>Set <code>EmailSettings.EnableSignUpWithEmail</code> and <code>EmailSettings.EnableSignInWithEmail</code> to true before importing.</p>\n<p>If your production environment uses LDAP or SAML, migrate authentication after the import completes. Do not attempt to import into a server where email sign-up is disabled.</p>"
        },
        {
         "title": "📎 File size limits",
         "html": "<p><code>FileSettings.MaxFileSize</code> defaults to a value that may be smaller than attachments in the source export. When an attachment exceeds this limit, it is silently skipped during import rather than causing a job failure. You may not discover missing files until the validation step.</p>\n<p>Set <code>FileSettings.MaxFileSize</code> higher than the largest file in your export before importing. Check the <code>mmetl</code> transform log for the largest attachment it processed.</p>"
        },
        {
         "title": "🔍 Search indexing",
         "html": "<p>If Elasticsearch indexing is enabled on the target server, every imported post triggers an indexing write. For large imports, this creates significant overhead and can cause the import job to run significantly slower or time out.</p>\n<p>Set <code>ElasticsearchSettings.EnableIndexing</code>, <code>EnableSearching</code>, and <code>EnableAutocomplete</code> to false before importing.</p>\n<p>After the import completes and validates, purge the index and rebuild it with a full reindex.</p>"
        }
       ]
      },
      {
       "t": "flip",
       "front": "<p><img class=\"icon\" src=\"images/warning.svg\" alt=\"Warning\" /> <strong>Common Mistake</strong></p>\n<p>Importing into an existing team rather than a fresh one.</p>",
       "back": "<p>The bulk import tool creates or overwrites records. It cannot selectively merge content into a team that already has active users and recent posts.</p>\n<p><strong>Fix:</strong> Use a fresh Mattermost server or team for every trial and production import.</p>"
      },
      {
       "t": "flip",
       "front": "<p><img class=\"icon\" src=\"images/warning.svg\" alt=\"Warning\" /> <strong>Common Mistake</strong></p>\n<p>Forgetting to restore server settings after import.</p>",
       "back": "<p>Settings like disabled Elasticsearch indexing and elevated file size limits are appropriate only during the import window. Leaving them in place after migration affects search performance and security posture.</p>\n<p><strong>Fix:</strong> Create a post-migration checklist to restore all modified settings.</p>"
      }
     ]
    }
   ]
  },
  {
   "title": "Slack Migration",
   "pages": [
    {
     "id": "01a0f875-a339-7fba-9127-68f1aedfa182",
     "title": "Content Mapping",
     "kind": "content",
     "blocks": [
      {
       "t": "html",
       "html": "<h3>Slack Content Mapping</h3>\n<p>Before you touch a Slack export, you need to know what has a path into Mattermost and what requires separate handling.</p>\n<p>What you can even export from Slack depends on you plan. A <strong>standard export</strong> includes only public channels. An <strong>all-channels export</strong>, which includes private channels, DMs, and group messages, requires Business+ or Enterprise Grid. Confirm the plan and export scope before the migration is scheduled.</p>\n<p>Review the tables below together. The &quot;does not migrate&quot; list drives your pre-cutover preparation checklist. These items require manual recreation in Mattermost or special planning, and they should be scoped as separate line items in your migration plan.</p>\n<hr />\n<p><strong>Content that migrates from Slack</strong></p>\n<table>\n<thead>\n<tr>\n<th>Content Type</th>\n<th style=\"text-align:center\">Migrates</th>\n<th>Notes</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>Workspaces</td>\n<td style=\"text-align:center\">Yes</td>\n<td>Map to Mattermost Teams</td>\n</tr>\n<tr>\n<td>Public channels</td>\n<td style=\"text-align:center\">Yes</td>\n<td>Maps directly to Mattermost public channels</td>\n</tr>\n<tr>\n<td>Private channels</td>\n<td style=\"text-align:center\">Yes</td>\n<td>Maps directly to Mattermost private channels</td>\n</tr>\n<tr>\n<td>1:1 DMs</td>\n<td style=\"text-align:center\">Yes</td>\n<td>Maps directly to Mattermost DMs</td>\n</tr>\n<tr>\n<td>Group DMs</td>\n<td style=\"text-align:center\">Yes</td>\n<td>Maps to Mattermost group messages. Groups over 8 participants convert to private channels.</td>\n</tr>\n<tr>\n<td>Threads and replies</td>\n<td style=\"text-align:center\">Yes</td>\n<td>Preserved as Mattermost threaded replies</td>\n</tr>\n<tr>\n<td>File attachments</td>\n<td style=\"text-align:center\">Yes</td>\n<td>Files attached to messages</td>\n</tr>\n<tr>\n<td>Emoji reactions</td>\n<td style=\"text-align:center\">Yes</td>\n<td>Skin-tone variants are dropped</td>\n</tr>\n<tr>\n<td>Users</td>\n<td style=\"text-align:center\">Yes</td>\n<td>Name, email, and title</td>\n</tr>\n<tr>\n<td>Deactivated users</td>\n<td style=\"text-align:center\">Yes</td>\n<td>Imported as deactivated accounts</td>\n</tr>\n<tr>\n<td>Bot users</td>\n<td style=\"text-align:center\">Yes</td>\n<td>Require --bot-owner flag</td>\n</tr>\n<tr>\n<td>Channel mentions</td>\n<td style=\"text-align:center\">Yes</td>\n<td>When the referenced channel is in the export</td>\n</tr>\n<tr>\n<td>Standard emoji</td>\n<td style=\"text-align:center\">Yes</td>\n<td>Without skin-tone variants</td>\n</tr>\n</tbody>\n</table>\n<p><strong>Content that does not migrate from Slack:</strong></p>\n<table>\n<thead>\n<tr>\n<th>Content Type</th>\n<th style=\"text-align:center\">Migrates</th>\n<th>Action Required</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>Integrations</td>\n<td style=\"text-align:center\">No</td>\n<td>Apps, webhooks, and slash commands must be recreated manually in Mattermost</td>\n</tr>\n<tr>\n<td>Workflow Builder automations</td>\n<td style=\"text-align:center\">No</td>\n<td>Rebuild with Mattermost Playbooks or no-code automation Platforms (n8n, Make, Zapier)</td>\n</tr>\n<tr>\n<td>Custom emoji</td>\n<td style=\"text-align:center\">No</td>\n<td>Reupload with matching names</td>\n</tr>\n<tr>\n<td>User profile pictures</td>\n<td style=\"text-align:center\">No</td>\n<td>Users reupload their own</td>\n</tr>\n<tr>\n<td>User groups</td>\n<td style=\"text-align:center\">No</td>\n<td>Recreate with Mattermost Custom Groups</td>\n</tr>\n<tr>\n<td>Custom profile fields</td>\n<td style=\"text-align:center\">No</td>\n<td>Recreate as Mattermost user attributes</td>\n</tr>\n<tr>\n<td>Slack Canvases</td>\n<td style=\"text-align:center\">No</td>\n<td>Download canvases.json from Slack export</td>\n</tr>\n<tr>\n<td>Starred conversations</td>\n<td style=\"text-align:center\">No</td>\n<td>Save messages in Mattermost after import</td>\n</tr>\n</tbody>\n</table>"
      },
      {
       "t": "flip",
       "front": "<p><img class=\"icon\" src=\"images/warning.svg\" alt=\"Warning\" /> <strong>Common Mistake</strong></p>\n<p>Assuming all Slack integrations need to be rebuilt from scratch.</p>",
       "back": "<p>Incoming webhook payloads and custom slash command request formats are Slack-compatible in Mattermost. Point existing integrations at the new Mattermost URL and they will work without modification.</p>\n<p>Slack custom apps do require full rebuilds, so scope those separately from simple webhooks.</p>"
      },
      {
       "t": "callout",
       "kind": "info",
       "title": "",
       "html": "<p>Learn more about content mapping and migration preparations in the <a href=\"https://docs.mattermost.com/administration-guide/onboard/migrate-from-slack\" target=\"_blank\" rel=\"noopener\">Slack migration guide</a>.</p>"
      }
     ]
    },
    {
     "id": "01a0f905-a046-7da1-89ac-515f8d1df7cc",
     "title": "Enterprise Grid",
     "kind": "content",
     "blocks": [
      {
       "t": "html",
       "html": "<h3>Slack Enterprise Grid</h3>\n<p>Slack Enterprise Grid combines multiple workspaces under a single organizational plan. If your customer is on a single standard workspace, this page does not apply, and you can proceed directly to the Migration Decisions page.</p>\n<p>Grid changes the shape of the export. A single-workspace export is one flat archive. A Grid export is an org-level archive containing every workspace's data together. This structural difference means mmetl transform slack cannot run directly against a Grid export. You need an extra step first, which this page covers.</p>\n<p><strong>Standard Slack Export/</strong></p>\n<pre><code>├── channel1/\n│ ├── 2024-01-15.json\n│ └── 2024-01-16.json\n├── channel2/\n│ ├── 2024-02-01.json\n│ └── 2024-02-02.json\n├── channel3/\n│ └── 2024-03-10.json\n├── channels.json\n├── users.json\n├── groups.json\n├── dms.json\n├── mpims.json\n└── integration_logs.json\n</code></pre>\n<p><strong>Enterprise Grid Export/</strong></p>\n<pre><code>├── shared-channel1/\n│ ├── 2023-01-01.json\n│ └── 2023-01-02.json\n├── shared-channel2/\n│ ├── 2023-05-01.json\n│ └── 2023-05-02.json\n├── teams/\n│ ├── team1/\n│ │ ├── channel3/\n│ │ ├── channels.json\n│ │ ├── mpims.json\n│ │ ├── dms.json\n│ │ ├── users.json\n│ │ └── groups.json\n│ └── team2/\n│ ├── channel4/\n│ ├── channels.json\n│ ├── mpims.json\n│ ├── dms.json\n│ ├── users.json\n│ └── groups.json\n├── channels.json\n├── org_users.json\n├── mpims.json\n├── dms.json\n└── groups.json\n</code></pre>\n<p>Slack workspaces correspond to Mattermost teams. During planning, you decide how each Grid workspace maps to a destination team in Mattermost. For most customers, mapping each workspace to its own team is the simplest and most faithful approach.</p>\n<p>The harder decision is shared channels. Slack allows a channel to be shared across multiple workspaces in a Grid org. Mattermost does not support a channel shared between teams the same way. A shared channel must be assigned to exactly one destination team.<br />\nMake this mapping decision before you run any transform.</p>\n<p>The <code>mmetl grid-transform</code> command reads the org-level archive and produces one zip per workspace.</p>"
      },
      {
       "t": "flip",
       "front": "<p><img class=\"icon\" src=\"images/warning.svg\" alt=\"Warning\" /> <strong>Common Mistake</strong></p>\n<p>Running <code>mmetl transform slack</code> directly against a Grid export.</p>",
       "back": "<p>Grid exports fail the transform because their archive structure is different from a single-workspace export.</p>\n<p><strong>Fix:</strong> Run <code>mmetl grid-transform</code> first to split the Grid export into per-workspace archives, then run <code>mmetl transform slack</code> against each one.</p>"
      }
     ]
    }
   ]
  },
  {
   "title": "RocketChat Migration",
   "pages": [
    {
     "id": "01a0f877-3e86-7148-a338-e7011ce8b481",
     "title": "Content Mapping",
     "kind": "content",
     "blocks": [
      {
       "t": "html",
       "html": "<p>RocketChat Content Mapping</p>\n<p>RocketChat has no workspace export feature. The migration source is the MongoDB database that backs your RocketChat installation, exported with the <code>mongodump</code> tool. This makes the RocketChat migration path a database operation, not an application export, which is a meaningfully different starting point than Slack.</p>\n<p>That difference matters for planning. A Slack export is something a workspace admin requests through a web UI. A RocketChat export requires direct access to the production database and the <code>mongodump</code> tooling, which usually means involving a database administrator or infrastructure owner earlier in the process than you would for a Slack migration.</p>\n<p><strong>Content that migrates from RocketChat</strong></p>\n<table>\n<thead>\n<tr>\n<th>Content Type</th>\n<th style=\"text-align:center\">Migrates</th>\n<th>Notes</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>Public channels</td>\n<td style=\"text-align:center\">Yes</td>\n<td>Display name, purpose, and header preserved</td>\n</tr>\n<tr>\n<td>Private channels</td>\n<td style=\"text-align:center\">Yes</td>\n<td>Maps directly to Mattermost private channels</td>\n</tr>\n<tr>\n<td>1:1 direct messages</td>\n<td style=\"text-align:center\">Yes</td>\n<td>Self-DMs are preserved</td>\n</tr>\n<tr>\n<td>Discussions</td>\n<td style=\"text-align:center\">Yes</td>\n<td>Map to standalone Mattermost channels</td>\n</tr>\n<tr>\n<td>Group DMs</td>\n<td style=\"text-align:center\">Yes</td>\n<td>Become Mattermost group messages. Groups over 8 participants convert to private channels.</td>\n</tr>\n<tr>\n<td>Threads and replies</td>\n<td style=\"text-align:center\">Yes</td>\n<td>Become Mattermost threaded replies</td>\n</tr>\n<tr>\n<td>File attachments</td>\n<td style=\"text-align:center\">Yes</td>\n<td>From GridFS or FileSystem storage</td>\n</tr>\n<tr>\n<td>Emoji reactions</td>\n<td style=\"text-align:center\">Yes</td>\n<td>Skin-tone modifiers are stripped</td>\n</tr>\n<tr>\n<td>Users</td>\n<td style=\"text-align:center\">Yes</td>\n<td>Inactive users imported as deactivated</td>\n</tr>\n<tr>\n<td>Bot users</td>\n<td style=\"text-align:center\">Yes</td>\n<td>Require --bot-owner flag</td>\n</tr>\n<tr>\n<td>Join/leave events</td>\n<td style=\"text-align:center\">Yes</td>\n<td>Converted to Mattermost system messages</td>\n</tr>\n</tbody>\n</table>\n<p><strong><strong>Content that does not migrate from</strong> RocketChat</strong></p>\n<table>\n<thead>\n<tr>\n<th>Content Type</th>\n<th style=\"text-align:center\">Migrates</th>\n<th>Action Required</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>Custom emoji</td>\n<td style=\"text-align:center\">No</td>\n<td>Re-upload with matching names; reaction names are preserved</td>\n</tr>\n<tr>\n<td>Integrations</td>\n<td style=\"text-align:center\">No</td>\n<td>Webhooks and slash commands must be recreated manually in Mattermost</td>\n</tr>\n<tr>\n<td>User profile pictures</td>\n<td style=\"text-align:center\">No</td>\n<td>Users upload their own</td>\n</tr>\n<tr>\n<td>RocketChat apps</td>\n<td style=\"text-align:center\">No</td>\n<td>Evaluate Mattermost pre-built plugin equivalents or built as a custom plugin</td>\n</tr>\n</tbody>\n</table>"
      },
      {
       "t": "flip",
       "front": "<p><img class=\"icon\" src=\"images/warning.svg\" alt=\"Warning\" /> <strong>Common Mistake</strong></p>\n<p>Expecting Discussions to appear as threaded replies in Mattermost.</p>",
       "back": "<p>RocketChat Discussions become standalone channels, not threads. Users who relied on Discussions for organized sub-conversations will need to adjust their workflow. Set this expectation with end users before the cutover, not after.</p>"
      }
     ]
    },
    {
     "id": "01a0f91f-632e-70eb-b92d-4ea936d12f59",
     "title": "Attachment Storage",
     "kind": "content",
     "blocks": [
      {
       "t": "html",
       "html": "<p>RocketChat Attachment Storage</p>\n<p>RocketChat stores uploaded files in one of two ways, and the storage type determines how you run the attachment transform. Get this wrong and the import will complete successfully but every file attachment will be missing, a problem you may not discover until validation.</p>\n<table>\n<thead>\n<tr>\n<th>Storage Type</th>\n<th>Where Files Live</th>\n<th>Transform Requirement</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td><strong>GridFS</strong></td>\n<td>Inside MongoDB</td>\n<td>Captured automatically in the <code>mongodump</code>No extra flag needed.</td>\n</tr>\n<tr>\n<td><strong>FileSystem</strong></td>\n<td>On disk, outside MongoDB</td>\n<td><code>mongodump</code> captures metadata only. Copy the uploads directory and pass <code>--uploads-dir</code> to <code>mmetl transform rocketchat</code>.</td>\n</tr>\n</tbody>\n</table>\n<p>Find your storage type in the RocketChat admin console at <strong>Admin</strong> &gt; <strong>Settings</strong> &gt; <strong>File Upload</strong> &gt; <strong>Storage Type</strong>.</p>\n<p>If the deployment uses FileSystem storage, arrange access to the uploads directory alongside your MongoDB access request. Both need to be captured in the same export window so the attachment references in the transformed JSONL line up with files you actually have.</p>"
      },
      {
       "t": "flip",
       "front": "<p><img class=\"icon\" src=\"images/warning.svg\" alt=\"Warning\" /> <strong>Common Mistake</strong></p>\n<p>Using FileSystem storage without passing <code>--uploads-dir</code></p>",
       "back": "<p>When RocketChat uses FileSystem storage, attachment binary data is stored on disk, not in MongoDB. A mongodump captures only the file metadata.</p>\n<p>Without <code>--uploads-dir</code> pointing at the on-disk uploads location, <code>mmetl</code> has no attachment data to extract, and the import completes with every file reference pointing to nothing.</p>"
      }
     ]
    }
   ]
  },
  {
   "title": "Knowledge Check",
   "pages": [
    {
     "id": "01a0eed0-56fe-7f66-9177-6c4771463973",
     "title": "Quiz",
     "kind": "quiz",
     "blocks": [
      {
       "t": "mc",
       "id": "01a0f935-8cff-7eec-9a82-71a5e2fc4127",
       "question": "Which answer best reflects the recommended approach for this scenario?",
       "subtext": "An admin is preparing a destination Mattermost server for import and asks whether to use an existing team or create a new one. ",
       "hint": "Consider how mmetl resolves the destination team during the import stage.",
       "explanation": "A new team or server is always recommended to avoid data merge and overwrite issues.",
       "choices": [
        {
         "id": "c1",
         "text": "Use an existing team to preserve channel membership"
        },
        {
         "id": "c2",
         "text": "It does not matter, since the import creates all channels fresh regardless"
        },
        {
         "id": "c3",
         "text": "Use an existing team only if it has fewer than 100 members"
        },
        {
         "id": "c4",
         "text": "Create a new team, because the import maps all data to a single named team"
        }
       ],
       "correct": [
        "c4"
       ],
       "multi": false
      },
      {
       "t": "match",
       "id": "01a0f937-8431-704a-b227-64e9c4573822",
       "question": "Match each pipeline stage to its primary action:",
       "subtext": "",
       "hint": "The stages follow the sequence in which you actually touch each system.",
       "explanation": "",
       "pairs": [
        {
         "prompt": "Adjust server settings and plan team structure",
         "answer": "Preparation"
        },
        {
         "prompt": "Pull raw data from the source platform and configure your Mattermost server for import.",
         "answer": "Export"
        },
        {
         "prompt": "Run mmetl against the source export",
         "answer": "Transform"
        },
        {
         "prompt": "Use mmctl bulk import functionality to create content and users in Mattermost.",
         "answer": "Import"
        },
        {
         "prompt": "Compare Mattermost counts to summary baseline",
         "answer": "Validate"
        }
       ]
      },
      {
       "t": "mc",
       "id": "01a0eed0-5726-74bb-b0fe-8096cfe558b4",
       "question": "Re-running an identical bulk import archive against the same Mattermost server will create duplicate posts:",
       "subtext": "",
       "hint": "Think about what happens in a migration that requires multiple retry attempts",
       "explanation": "The Mattermost bulk import process is idempotent. Rerunning the same file does not duplicate posts because the import uses identity fields, such as timestamps, user, and channel, to detect existing records. This is by design to support the iterative migration workflow, where a failed job can be fixed and rerun safely.",
       "choices": [
        {
         "id": "c1",
         "text": "True"
        },
        {
         "id": "c2",
         "text": "False"
        }
       ],
       "correct": [
        "c2"
       ],
       "multi": false
      },
      {
       "t": "mc",
       "id": "01a0f92d-1da9-78e4-a88b-91189f9ebef0",
       "question": "What is likely to happen in this scenario:",
       "subtext": "A Mattermost partner is migrating a customer from Slack Enterprise Grid with six workspaces. The partner runs `mmetl transform slack` directly against the Grid export zip.",
       "hint": "The Enterprise Grid export format is structurally different from a standard workspace export.",
       "explanation": "Grid exports contain org-level data and per-workspace folders in a structure that `mmetl transform slack` cannot parse directly. The correct workflow is to run `mmetl grid-transform` first to split the Grid export into individual per-workspace archives, then run `mmetl transform slack` against each one. ",
       "choices": [
        {
         "id": "c1",
         "text": "The transform succeeds and maps each workspace to a Mattermost team automatically"
        },
        {
         "id": "c2",
         "text": "The transform fails because Grid exports have a different archive structure than single-workspace exports"
        },
        {
         "id": "c3",
         "text": "The transform succeeds but only imports public channels from workspace 1"
        },
        {
         "id": "c4",
         "text": "The transform prompts for a workspace selection before proceeding"
        }
       ],
       "correct": [
        "c2"
       ],
       "multi": false
      }
     ]
    }
   ]
  }
 ],
 "config": {
  "testMode": true,
  "passMark": 0,
  "package": "module-1-0-migration-fundamentals",
  "build": {
   "time": "2026-11-27 06:03:44 UTC",
   "version": "dev-4391479030ff-test",
   "by": "a-jayallen",
   "how": "Local build",
   "command": "dispatch.py \"Migration Expert/course/course.yml\" --base https://a-jayallen.github.io/scorm-dispatch-pilot --channel staging --test --module 1.0 --module exam --out scorm/dist/pilot",
   "commit": "4391479030ff",
   "branch": "feat/scorm-dispatch",
   "uncommitted": 0,
   "mode": "test",
   "quiz": true
  }
 }
};
