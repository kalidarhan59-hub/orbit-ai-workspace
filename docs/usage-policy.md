# ORBIT Usage Policy

ORBIT contains **no application-level credit ledger, daily message counter, generation counter, or per-user usage quota**. The interface therefore does not stop a user because a locally tracked number of messages or image/site-generation runs has been reached.

The application retains bounded request safeguards that are not usage quotas. A text request is limited to 12,000 characters, individual uploads are limited to 16 MB, and up to five attachments may be supplied with one message. These constraints protect request handling, storage, and model-context integrity rather than tracking or limiting a user’s cumulative use.

Actual availability of an integrated model or image service remains dependent on that service responding successfully. ORBIT surfaces such provider errors rather than claiming an unavailable operation completed.
