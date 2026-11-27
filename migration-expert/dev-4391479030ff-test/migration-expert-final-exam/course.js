window.COURSE = {
 "number": "exam",
 "title": "Migration Expert: Final Exam",
 "guideId": "",
 "sections": [
  {
   "title": "Final Exam",
   "pages": [
    {
     "id": "migration-expert-final-exam",
     "title": "Final Exam",
     "kind": "quiz",
     "blocks": [
      {
       "t": "html",
       "html": "<p>Answer every question, then select Submit answers. You need 80% to pass, and you have three attempts. Each attempt asks all 33 questions in a new order. After you submit, you see your score, not the answers.</p>"
      },
      {
       "t": "mc",
       "id": "final-01",
       "question": "The customer wants full history and has a 4-hour cutover window. Their export is 2 TB. What's the approach?",
       "subtext": "",
       "hint": "Think about which work can happen before the window opens.",
       "explanation": "A baseline import moves most of the history while the old system is still in use. At cutover you only freeze the source and import the delta, which fits a short window. A 2 TB import won't finish in 4 hours. A fresh start drops the history the customer asked for. Skipping staging removes the rehearsal that finds failures before production.",
       "choices": [
        {
         "id": "c1",
         "text": "Run one import inside the cutover window."
        },
        {
         "id": "c2",
         "text": "Start fresh, and archive the old system as read-only."
        },
        {
         "id": "c3",
         "text": "Import straight to production, and skip the staging run to save time."
        },
        {
         "id": "c4",
         "text": "Import the history ahead of time as a baseline, freeze the source, then import a delta export at cutover."
        }
       ],
       "correct": [
        "c4"
       ],
       "multi": false
      },
      {
       "t": "mc",
       "id": "final-02",
       "question": "A job status of \"success\" means the migration can be accepted.",
       "subtext": "",
       "hint": "Think about what the job can and can't know about the data.",
       "explanation": "\"success\" only means the job processed every line without a fatal error. Missing attachments are logged as warnings, and content can import cleanly and still be wrong. Acceptance means comparing counts at each checkpoint and verifying as a user.",
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
       "id": "final-03",
       "question": "The target already has 40 pilot users who signed in with SAML. Which step prevents the import from stopping partway?",
       "subtext": "",
       "hint": "The import stops at the first collision it meets.",
       "explanation": "A bundle email that belongs to an existing account with a different username stops the import. Comparing every identity first finds all collisions at once, so you fix them before the run. A deactivated account still holds its email. Offline validate can't see server accounts. Changing the sign-in method doesn't change the email.",
       "choices": [
        {
         "id": "c1",
         "text": "Compare every email and username in the bundle against the server before the first import."
        },
        {
         "id": "c2",
         "text": "Deactivate the pilot users during the import."
        },
        {
         "id": "c3",
         "text": "Run validate in offline mode."
        },
        {
         "id": "c4",
         "text": "Switch the pilot users to email sign-in before the import."
        }
       ],
       "correct": [
        "c1"
       ],
       "multi": false
      },
      {
       "t": "match",
       "id": "final-04",
       "question": "Match each import-window risk to its mitigation.",
       "subtext": "",
       "hint": "Each risk comes from something the import window adds or changes.",
       "explanation": "Indexing during a bulk import slows the job, so it's rebuilt once afterward. A raised upload limit left in place lets any user upload files of that size. Pilot accounts cause collisions that stop the import. Medium bundles in date order are easier to retry than one huge bundle.",
       "pairs": [
        {
         "prompt": "Elasticsearch indexing during the import",
         "answer": "Turn it off, then purge and rebuild after"
        },
        {
         "prompt": "Raised Maximum File Size",
         "answer": "A restore step in the cutover checklist"
        },
        {
         "prompt": "Pilot accounts on the target",
         "answer": "Compare identities before the first import"
        },
        {
         "prompt": "A very large history",
         "answer": "Several medium bundles, imported in date order"
        }
       ]
      },
      {
       "t": "mc",
       "id": "final-05",
       "question": "After the import, an existing admin's email has changed to the address from the source system. Why?",
       "subtext": "",
       "hint": "Think about how the importer decides that a user already exists.",
       "explanation": "The importer matches existing users by username. When a bundle username matches, the records merge and the bundle's email overwrites the existing one. No error is raised. Validate never writes to the server, and the import has no special rule for admins. Compare usernames as well as emails before the first import.",
       "choices": [
        {
         "id": "c1",
         "text": "SAML attribute sync ran during the import."
        },
        {
         "id": "c2",
         "text": "The import resets the emails of system admin accounts."
        },
        {
         "id": "c3",
         "text": "A bundle username matched the admin's account. The two merged, and the bundle's email replaced the old one."
        },
        {
         "id": "c4",
         "text": "Validate updated the email during its online check."
        }
       ],
       "correct": [
        "c3"
       ],
       "multi": false
      },
      {
       "t": "mc",
       "id": "final-06",
       "question": "A customer suggests --guest-handling user to avoid a Guest Accounts license. What's the right response?",
       "subtext": "",
       "hint": "Think about what a guest can reach once they're a full member.",
       "explanation": "\"user\" mode imports guests as regular members, with access to every public channel. For a DISC customer, that's an access-control change that needs written approval. \"skip\" drops the guests' posts and reactions too. Guests imported without a license don't behave as guests.",
       "choices": [
        {
         "id": "c1",
         "text": "Agree. Guests keep their channel-only access."
        },
        {
         "id": "c2",
         "text": "Explain that former guests get full member access. Get written approval, or license Guest Accounts."
        },
        {
         "id": "c3",
         "text": "Use \"skip\" instead. It keeps guest content without guest accounts."
        },
        {
         "id": "c4",
         "text": "Import them as guests. They'll behave as guests without a license."
        }
       ],
       "correct": [
        "c2"
       ],
       "multi": false
      },
      {
       "t": "mc",
       "id": "final-07",
       "question": "The production import stops at 02:00 on cutover night. Which sequence is correct?",
       "subtext": "",
       "hint": "Records created before the failure stay on the server.",
       "explanation": "The importer is built for retry. Posts are matched on channel, creation time and message, so reprocessing a corrected bundle finishes the job without duplicates. A restore costs hours of the window and isn't needed. Deleting the record turns an error into silent data loss. The same upload fails the same way every time.",
       "choices": [
        {
         "id": "c1",
         "text": "Restore the backup, run the transform again, then import from the start."
        },
        {
         "id": "c2",
         "text": "Delete the failing record, reprocess, then verify."
        },
        {
         "id": "c3",
         "text": "Reprocess the same upload until it passes, then verify."
        },
        {
         "id": "c4",
         "text": "Read the error line, fix the cause at its source record, rebuild and validate, upload and reprocess, then re-verify the counts."
        }
       ],
       "correct": [
        "c4"
       ],
       "multi": false
      },
      {
       "t": "match",
       "id": "final-08",
       "question": "Match each problem to the first stage that catches it.",
       "subtext": "",
       "hint": "Each stage sees one form of the data: the source export, the bundle, the server or the result.",
       "explanation": "The dry run reads the source export, so it finds what mmetl can't transform. Validate reads the bundle, so it finds broken records. The import job is the first stage to create accounts on the server, so it finds this collision. Only a person checking as a user sees content that imported without an error but is wrong.",
       "pairs": [
        {
         "prompt": "A user with no email in the export",
         "answer": "mmetl transform --dry-run"
        },
        {
         "prompt": "A malformed JSONL line",
         "answer": "mmctl import validate"
        },
        {
         "prompt": "A new username whose email belongs to an existing account",
         "answer": "The import job"
        },
        {
         "prompt": "Files that came across as links",
         "answer": "Verifying as a user"
        }
       ]
      },
      {
       "t": "mc",
       "id": "final-09",
       "question": "The customer expected DMs, but the export holds only public channels. Why?",
       "subtext": "",
       "hint": "Think about what each Slack export type contains.",
       "explanation": "A standard export holds public channels only. Private channels and DMs need a full export, which depends on the Slack plan and an approval. Check the export type before you plan the scope. mmetl transforms the DMs it's given, and splitting a Grid export doesn't remove any.",
       "choices": [
        {
         "id": "c1",
         "text": "It's a standard export, which holds public channels only. Private channels and DMs need a full export, which depends on the Slack plan and an approval."
        },
        {
         "id": "c2",
         "text": "mmetl skips DMs by default."
        },
        {
         "id": "c3",
         "text": "It's a Grid export that hasn't been split yet."
        },
        {
         "id": "c4",
         "text": "The DMs are in the attachments folder."
        }
       ],
       "correct": [
        "c1"
       ],
       "multi": false
      },
      {
       "t": "mc",
       "id": "final-10",
       "question": "To change the destination team after a transform, edit the team line in the JSONL.",
       "subtext": "",
       "hint": "Think about how many records carry the team name.",
       "explanation": "--team is written into every channel and post record, not stored once. Editing one line leaves every other record pointing at the old team. Run the transform again with the new value.",
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
       "id": "final-11",
       "question": "Before the import, you notice batch 4 of six was transformed with a different --guest-handling value. What do you do?",
       "subtext": "",
       "hint": "All six batches end up in the same history.",
       "explanation": "Guest handling is decided at transform time and written into the bundle, so each batch keeps its own value. Use the same --team, --guest-handling and --bot-owner values in every batch. Validate checks each bundle on its own, not consistency between batches. Editing the JSONL by hand is error-prone and leaves no record of the decision.",
       "choices": [
        {
         "id": "c1",
         "text": "Nothing. The server applies one guest setting to all batches."
        },
        {
         "id": "c2",
         "text": "Import it. Validate will flag the mismatch."
        },
        {
         "id": "c3",
         "text": "Run batch 4's transform again with the same flags as the other batches."
        },
        {
         "id": "c4",
         "text": "Edit the guest records in batch 4's JSONL."
        }
       ],
       "correct": [
        "c3"
       ],
       "multi": false
      },
      {
       "t": "match",
       "id": "final-12",
       "question": "Match each flag choice to its consequence.",
       "subtext": "",
       "hint": "Each choice is written into the bundle, so the import can't correct it.",
       "explanation": "A placeholder domain gives accounts emails nobody receives, so resets fail. \"user\" mode turns guests into full members. Each batch lands in the team named at transform time. mmetl can only package files that are present when it runs.",
       "pairs": [
        {
         "prompt": "--default-email-domain example.com",
         "answer": "Accounts that can't receive password resets"
        },
        {
         "prompt": "--guest-handling user without a Guest Accounts license",
         "answer": "Former guests get full member access"
        },
        {
         "prompt": "A different --team for each batch",
         "answer": "History split across teams"
        },
        {
         "prompt": "Attachments not fetched before the transform",
         "answer": "Posts without files"
        }
       ]
      },
      {
       "t": "mc",
       "id": "final-13",
       "question": "Grid @local placeholder accounts are active after the import. What happens before handoff?",
       "subtext": "",
       "hint": "Placeholders are active accounts that no person owns.",
       "explanation": "Each Grid placeholder is an active account with an <ID>@local email, so each one needs an owner decision. A real email may already belong to an account, which creates a collision. A permanent delete also removes the placeholder's posts. An active account with no owner is an audit finding, even if nobody knows its password.",
       "choices": [
        {
         "id": "c1",
         "text": "Replace each placeholder email with the person's real email."
        },
        {
         "id": "c2",
         "text": "Permanently delete them."
        },
        {
         "id": "c3",
         "text": "Leave them. Placeholders can't sign in."
        },
        {
         "id": "c4",
         "text": "Review each one, then map it to the real person or deactivate it."
        }
       ],
       "correct": [
        "c4"
       ],
       "multi": false
      },
      {
       "t": "mc",
       "id": "final-14",
       "question": "An air-gapped IL5 site receives a 60 GB bundle on removable media. The server isn't clustered. Which upload method fits best?",
       "subtext": "",
       "hint": "Which path avoids the upload limits and the proxy entirely?",
       "explanation": "The bundle is already on site, so copying it to the server's disk avoids the upload size limit and the proxy. --bypass-upload is supported because the server isn't clustered. The default limits reject a 60 GB file. A zip split into parts isn't a valid bundle. Dropping the attachments loses data.",
       "choices": [
        {
         "id": "c1",
         "text": "Upload through Mattermost with the default limits."
        },
        {
         "id": "c2",
         "text": "Copy the bundle to the server, and process it in local mode with --bypass-upload."
        },
        {
         "id": "c3",
         "text": "Split the bundle into parts, and upload each through Mattermost without changing the limits."
        },
        {
         "id": "c4",
         "text": "Rebuild the bundle without attachments to make it smaller."
        }
       ],
       "correct": [
        "c2"
       ],
       "multi": false
      },
      {
       "t": "mc",
       "id": "final-15",
       "question": "A power utility runs Mattermost as a 3-node HA cluster behind NGINX, with an S3 file store. The bundle is 35 GB. The operations team won't allow HA to be disabled during the change window. Which plan works?",
       "subtext": "",
       "hint": "Where must the bundle be so that every node in the cluster can read it?",
       "explanation": "With HA enabled, the job can run on any node, so the bundle must be in the shared file store. Uploading through Mattermost puts it there. --bypass-upload isn't supported while HA is enabled, and copies on each node don't change that. The current limits reject a 35 GB file, so retrying fails the same way. Restoring the limits belongs in the cutover checklist.",
       "choices": [
        {
         "id": "c1",
         "text": "Raise the upload size limit and the proxy's body size and timeouts for the window. Upload through Mattermost, process the upload, then restore the limits."
        },
        {
         "id": "c2",
         "text": "Copy the bundle to node 1, and process it in local mode with --bypass-upload."
        },
        {
         "id": "c3",
         "text": "Copy the bundle to all three nodes, so whichever node runs the job finds a local copy."
        },
        {
         "id": "c4",
         "text": "Upload through Mattermost with the current limits. If the upload fails, retry it in smaller parts."
        }
       ],
       "correct": [
        "c1"
       ],
       "multi": false
      },
      {
       "t": "mc",
       "id": "final-16",
       "question": "Which problem passes validate and only appears when the import job runs?",
       "subtext": "",
       "hint": "Think about what validate reads and what it never looks at.",
       "explanation": "Validate reads the bundle and compares it with some server records, but it doesn't read server settings. The domain restriction is a setting, and the server applies it to every account the import creates. Malformed lines, missing attachments and duplicates are bundle problems, and validate reports them.",
       "choices": [
        {
         "id": "c1",
         "text": "A malformed JSONL line."
        },
        {
         "id": "c2",
         "text": "An attachment missing from data/."
        },
        {
         "id": "c3",
         "text": "Restrict account creation to specified email domains blocks the bundle's email domain."
        },
        {
         "id": "c4",
         "text": "The same user appears twice in the bundle."
        }
       ],
       "correct": [
        "c3"
       ],
       "multi": false
      },
      {
       "t": "mc",
       "id": "final-17",
       "question": "A CI pipeline gates on mmctl import validate. Validate prints 14 errors, and the gate passes. Why?",
       "subtext": "",
       "hint": "Think about how the pipeline decides pass or fail.",
       "explanation": "A pipeline gate reads the exit code, and validate exits 0 even when it prints errors. Gate on the output instead, for example by failing when the error count isn't zero. Online or offline mode changes what validate can check, not its exit code. --team only tells validate which teams exist.",
       "choices": [
        {
         "id": "c1",
         "text": "The errors were warnings."
        },
        {
         "id": "c2",
         "text": "Validate ran offline, so the errors weren't final."
        },
        {
         "id": "c3",
         "text": "--team turns errors into warnings."
        },
        {
         "id": "c4",
         "text": "Validate exits 0 even when it reports errors."
        }
       ],
       "correct": [
        "c4"
       ],
       "multi": false
      },
      {
       "t": "mc",
       "id": "final-18",
       "question": "The production import stops at line 48,213 with \"email already exists\". 30,000 posts are already in. What's the next step?",
       "subtext": "",
       "hint": "Think about what happens to records that already exist when you reprocess.",
       "explanation": "Map the bundle username to the existing account, then rebuild and reprocess. Records already on the server are matched, not duplicated, so the job continues past the failing line. A restore isn't needed. Deleting the line drops that user and breaks every reference to them. A new team splits the history.",
       "choices": [
        {
         "id": "c1",
         "text": "Restore the database and file store, then start over."
        },
        {
         "id": "c2",
         "text": "Fix the mapping, rebuild, validate and upload, then reprocess on the same target."
        },
        {
         "id": "c3",
         "text": "Delete the failing line from the JSONL, then reprocess."
        },
        {
         "id": "c4",
         "text": "Import the remaining records into a new team."
        }
       ],
       "correct": [
        "c2"
       ],
       "multi": false
      },
      {
       "t": "mc",
       "id": "final-19",
       "question": "The rebuilt zip validates clean and was uploaded. Processing still fails with the original error. What's the most likely cause?",
       "subtext": "",
       "hint": "How many uploads does the server hold now?",
       "explanation": "Each upload is stored under a new name made from its upload session ID and the file name. Processing the old name runs the old bundle and repeats the old error. List the available imports and process the new name, or delete the old upload. The server doesn't cache job errors, and a restart doesn't change which file is processed.",
       "choices": [
        {
         "id": "c1",
         "text": "The old upload was processed instead of the new one."
        },
        {
         "id": "c2",
         "text": "The server caches the previous job's errors."
        },
        {
         "id": "c3",
         "text": "The job needs a server restart after a failure."
        },
        {
         "id": "c4",
         "text": "Validate and the import job use different schemas."
        }
       ],
       "correct": [
        "c1"
       ],
       "multi": false
      },
      {
       "t": "match",
       "id": "final-20",
       "question": "Match each symptom to its cause.",
       "subtext": "",
       "hint": "Decide whether each symptom comes from the upload, from the job's settings or from storage.",
       "explanation": "The server renames each upload, so the original file name doesn't exist. The upload limit rejects a bundle larger than Maximum File Size. The domain restriction blocks account creation for domains not on the list. The job writes each attachment to the file store, so a storage problem fails there.",
       "pairs": [
        {
         "prompt": "\"file does not exist\" after a clean upload",
         "answer": "The wrong upload name was processed"
        },
        {
         "prompt": "\"File is too large\"",
         "answer": "Maximum File Size is below the bundle size"
        },
        {
         "prompt": "An accepted-domain error on a user",
         "answer": "The email domain restriction"
        },
        {
         "prompt": "An attachment upload error",
         "answer": "The file store isn't writable or is full"
        }
       ]
      },
      {
       "t": "mc",
       "id": "final-21",
       "question": "After cutover, users can't find old Slack conversations in search. What fixes it?",
       "subtext": "",
       "hint": "Think about what was turned off during the import window.",
       "explanation": "Posts imported while Elasticsearch indexing was off aren't in the index. Purge and rebuild it, then re-enable search. Reprocessing matches existing posts and doesn't index them. Collapsed Reply Threads and the upload limit don't affect search.",
       "choices": [
        {
         "id": "c1",
         "text": "Reprocess the import."
        },
        {
         "id": "c2",
         "text": "Turn on Collapsed Reply Threads."
        },
        {
         "id": "c3",
         "text": "Purge and rebuild the Elasticsearch index."
        },
        {
         "id": "c4",
         "text": "Raise Maximum File Size."
        }
       ],
       "correct": [
        "c3"
       ],
       "multi": false
      },
      {
       "t": "mc",
       "id": "final-22",
       "question": "Which records do you sample first after a Slack import?",
       "subtext": "",
       "hint": "Think about which records the transform changed or filled in.",
       "explanation": "DMs and group messages belong to no team, and large groups were converted to channels. Archived channels may have approximate timestamps. Deactivated authors must keep their authorship, and placeholders need review. Large public channels and recent posts carry the least risk, so they tell you the least.",
       "choices": [
        {
         "id": "c1",
         "text": "The largest public channels."
        },
        {
         "id": "c2",
         "text": "The most recent posts."
        },
        {
         "id": "c3",
         "text": "Posts by bots."
        },
        {
         "id": "c4",
         "text": "DMs and group messages, archived channels, deactivated authors and placeholders."
        }
       ],
       "correct": [
        "c4"
       ],
       "multi": false
      },
      {
       "t": "mc",
       "id": "final-23",
       "question": "mmctl auth delete revokes the operator's admin session on the server.",
       "subtext": "",
       "hint": "Think about where auth delete makes its change.",
       "explanation": "auth delete only removes the stored credentials from the operator's machine. The session token stays valid on the server until it expires or is revoked. Revoke it in the System Console, so a copied token can't be reused with admin rights.",
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
       "id": "final-24",
       "question": "RocketChat uses FileSystem storage. The transform succeeds, but no attachments come through. What's the cause?",
       "subtext": "",
       "hint": "Think about where FileSystem storage keeps the file bytes.",
       "explanation": "With FileSystem storage, the files are on the RocketChat server's disk, not in MongoDB. mmetl finds them only in the directory passed with --uploads-dir. The chunks collection matters for GridFS storage. Maximum File Size applies to the upload, not the transform. Only generated thumbnails are skipped, not originals.",
       "choices": [
        {
         "id": "c1",
         "text": "The dump has no chunks collection."
        },
        {
         "id": "c2",
         "text": "The uploads directory wasn't copied and passed with --uploads-dir."
        },
        {
         "id": "c3",
         "text": "Maximum File Size is too low."
        },
        {
         "id": "c4",
         "text": "mmetl skipped the files as thumbnails."
        }
       ],
       "correct": [
        "c2"
       ],
       "multi": false
      },
      {
       "t": "mc",
       "id": "final-25",
       "question": "The RocketChat server stores uploads in Amazon S3. What do you tell the customer before the transform?",
       "subtext": "",
       "hint": "Think about which storage types the transform knows how to read.",
       "explanation": "The mmetl version in this course reads GridFS and FileSystem storage. It logs files in other stores as unknown and skips them. Neither mmetl nor the import job fetches files from S3. Raise it before the transform, so the customer decides how to handle attachments instead of finding them missing after cutover.",
       "choices": [
        {
         "id": "c1",
         "text": "The mmetl version in this course skips files in S3, so settle attachments as a scope decision first."
        },
        {
         "id": "c2",
         "text": "mmetl reads S3 directly if you give it credentials."
        },
        {
         "id": "c3",
         "text": "The import job fetches the files from S3 during the import."
        },
        {
         "id": "c4",
         "text": "mmetl copies S3 files into the bundle automatically."
        }
       ],
       "correct": [
        "c1"
       ],
       "multi": false
      },
      {
       "t": "mc",
       "id": "final-26",
       "question": "The source has 30 private rooms, and 1 of them is encrypted. It also has 2 direct rooms with 12 members each. How many private channels do you predict?",
       "subtext": "",
       "hint": "Start from the private rooms, then apply each rule that adds or removes a channel.",
       "explanation": "Encrypted rooms are skipped, so 30 becomes 29. A Mattermost group message holds at most 8 people, so direct rooms with more than 8 members become private channels. That adds 2, for 31.",
       "choices": [
        {
         "id": "c1",
         "text": "29"
        },
        {
         "id": "c2",
         "text": "30"
        },
        {
         "id": "c3",
         "text": "31"
        },
        {
         "id": "c4",
         "text": "32"
        }
       ],
       "correct": [
        "c3"
       ],
       "multi": false
      },
      {
       "t": "match",
       "id": "final-27",
       "question": "Match each RocketChat item to its outcome in Mattermost.",
       "subtext": "",
       "hint": "Think about what mmetl can read and what Mattermost can hold.",
       "explanation": "mmetl can't read encrypted content, so the room and its history are skipped. A group message holds at most 8 people, so a larger direct room becomes a private channel. Discussions become channels of their own. Pin events are dropped, so the message arrives unpinned.",
       "pairs": [
        {
         "prompt": "An encrypted room",
         "answer": "Skipped, along with its history"
        },
        {
         "prompt": "A direct room with 11 members",
         "answer": "A private channel with a generated name"
        },
        {
         "prompt": "A discussion",
         "answer": "A new channel with a generated name"
        },
        {
         "prompt": "A pinned message",
         "answer": "A message without the pin"
        }
       ]
      },
      {
       "t": "mc",
       "id": "final-28",
       "question": "--attachments-dir sets the name of the attachments folder inside the bundle.",
       "subtext": "",
       "hint": "Think about where the import job looks for files.",
       "explanation": "The import job always reads attachments from the data/ folder in the bundle. --attachments-dir only changes where mmetl writes the files on disk. If the two differ, rename the folder to data before you zip the bundle.",
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
       "id": "final-29",
       "question": "Users with no email get @utility.example addresses. The target restricts account creation to utility.org, and validate passes. What happens when the job runs?",
       "subtext": "",
       "hint": "Think about which checks run only when the server creates an account.",
       "explanation": "The server applies the domain restriction to every account it creates outside LDAP and SAML, including imported accounts. Validate doesn't read server settings, so it passes. The job stops at the first blocked user. Add the domain for the import window, or choose an approved domain before the transform.",
       "choices": [
        {
         "id": "c1",
         "text": "The users import, but can't sign in."
        },
        {
         "id": "c2",
         "text": "The import rewrites the emails to the allowed domain."
        },
        {
         "id": "c3",
         "text": "Nothing. The restriction only applies to sign-up pages."
        },
        {
         "id": "c4",
         "text": "The job stops at the first user with that domain."
        }
       ],
       "correct": [
        "c4"
       ],
       "multi": false
      },
      {
       "t": "mc",
       "id": "final-30",
       "question": "The source shows 110 messages, validate shows 60 posts, and the server shows 79. The help desk reports data loss. Which statement is correct?",
       "subtext": "",
       "hint": "Think about what each checkpoint counts as a post.",
       "explanation": "The source counts every reply as a message. Validate counts post records, with replies nested inside them, so its total is the lowest. The server counts each reply as a post again. The transform also drops system events such as pins and room changes. Every gap has an expected cause, so no data was lost.",
       "choices": [
        {
         "id": "c1",
         "text": "Validate nests replies inside root posts, the server counts each reply as a post, and the transform dropped system events."
        },
        {
         "id": "c2",
         "text": "Data was lost between validate and the server."
        },
        {
         "id": "c3",
         "text": "The server counted some replies twice."
        },
        {
         "id": "c4",
         "text": "Validate only counts posts in public channels."
        }
       ],
       "correct": [
        "c1"
       ],
       "multi": false
      },
      {
       "t": "match",
       "id": "final-31",
       "question": "Match each count difference to its reason.",
       "subtext": "",
       "hint": "Each difference comes from one stage's counting rules or the server's defaults.",
       "explanation": "Each new team gets two default channels. The server counts every reply as a post. Validate doesn't count attachments on replies and lists them as unused. The transform drops app accounts and guests with no channels.",
       "pairs": [
        {
         "prompt": "The server has 2 more channels than validate",
         "answer": "The default channels for each new team"
        },
        {
         "prompt": "Server posts exceed validate posts",
         "answer": "Replies counted as posts"
        },
        {
         "prompt": "Validate counts fewer attachments than the transform",
         "answer": "Reply attachments listed as unused"
        },
        {
         "prompt": "Fewer users after the transform than in the source",
         "answer": "App accounts and channel-less guests dropped"
        }
       ]
      },
      {
       "t": "mc",
       "id": "final-32",
       "question": "After the RocketChat cutover, every user's Threads view is empty. What's the cause?",
       "subtext": "",
       "hint": "Think about what decides which threads appear in the view.",
       "explanation": "The Threads view lists the threads a user follows. The import format can carry followers, but mmetl doesn't write them, so nobody follows any imported thread. The threads are intact. A user follows a thread again by replying, being mentioned or selecting Follow.",
       "choices": [
        {
         "id": "c1",
         "text": "Replies weren't imported."
        },
        {
         "id": "c2",
         "text": "No thread followers were imported. The threads are intact in their channels."
        },
        {
         "id": "c3",
         "text": "The Elasticsearch index is empty."
        },
        {
         "id": "c4",
         "text": "Replies were imported as separate posts."
        }
       ],
       "correct": [
        "c2"
       ],
       "multi": false
      },
      {
       "t": "mc",
       "id": "final-33",
       "question": "After the RocketChat import, users request password resets, and no email arrives. What's the most likely cause?",
       "subtext": "",
       "hint": "Think about what the import window turned off.",
       "explanation": "Reset emails need working SMTP and email notifications turned on. If the import window turned notifications off, turn them back on before you announce activation. Imported accounts aren't locked, and password reset works for them. SSO sign-in is an option after mmctl user migrate-auth, not a requirement.",
       "choices": [
        {
         "id": "c1",
         "text": "Imported accounts are locked until an admin activates them."
        },
        {
         "id": "c2",
         "text": "Password reset is disabled for imported accounts."
        },
        {
         "id": "c3",
         "text": "SMTP or email notifications are still off from the import window."
        },
        {
         "id": "c4",
         "text": "Imported accounts can only sign in with SSO."
        }
       ],
       "correct": [
        "c3"
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
  "passMark": 0.8,
  "package": "migration-expert-final-exam",
  "quiz": {
   "attempts": 3,
   "shuffle": true,
   "feedback": "score",
   "hints": false
  },
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
