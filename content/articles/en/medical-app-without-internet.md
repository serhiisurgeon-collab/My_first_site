<!-- Title: A Medical App Without Internet: What Needs to Be Considered. Section: Technology. -->

“Works without internet” is a useful description of a medical app. But what does it actually mean? Being able to open the home screen, read a previously downloaded reference, perform a calculation, or save a record that remains available after restarting the phone?

These capabilities are related, but they are different. Users need to know which parts of their work they can complete without connectivity, what they must prepare beforehand and which limitations will appear. Developers need to define how the tool behaves in each of these situations.

I am a Ukrainian military physician, working in medical planning and TCCC/CLS education, and developing S-Dose. This combination of medicine and development explains my interest in the subject. In this article, S-Dose provides context rather than an example of a verified implementation: its specific offline functions, update mechanisms, data protection and test results are not assessed here.

The central question goes beyond having a local reference: **can someone complete the necessary task without a network connection, while understanding the state of the information and the outcome of their actions?**

## Offline is a property of a particular function

Android Developers describes an offline-first approach as the ability to perform all, or a critical subset, of an app's core functionality without internet access. This requires a local data source; reading and writing capabilities are considered separately [1]. An “offline” label should therefore be explained in terms of specific actions.

Launching means the app opens. Reference access means the required materials are on the device. Search requires a way to find information within those materials. A calculation depends on where it runs and where its necessary rules and values come from. Saving a record requires reliable local storage. Synchronisation, where provided, exchanges changes with another system once connectivity returns.

Not every app needs all these capabilities. A simple reference may have no account, patient record system or synchronisation. A calculator may perform calculations on the device while downloading reference data separately. A tool for shared records has different dependencies and more complex requirements.

**Hypothetical example.** A user has downloaded the text of a recommendation, but the app's search function calls a server. Without connectivity, the text can be reached through the menu but not found through the search box. This reflects a difference between two functions that should be explained beforehand.

Information stored on a device can also take different forms. Materials may be included with the installed app, downloaded as a separate package, or retained temporarily after viewing. That temporary copy is called a cache. Android explicitly warns that cache files may be deleted when storage space is low [2]. Viewing a page online therefore does not establish that it will remain reliably available later.

For a medical tool, it is useful to show which materials have been saved for offline access and which still need downloading. An empty search result should explain the situation: the information is absent from the downloaded collection, search is unavailable, or the material does not exist in the reference at all. These are different causes requiring different actions.

## Preparation starts before connectivity is lost

Offline operation should be tested from the state in which the tool will actually be used. Installation may require connectivity; the first launch may require additional materials; access to particular sections may require authentication. Even after signing in, a session — the period of confirmed access — may expire.

Users need a clear explanation of what is installed immediately, what is downloaded separately, whether the first launch must occur online and how to check that preparation is complete. If a reference remains available without authentication but personal records require a confirmed sign-in, that distinction should also be visible.

**Hypothetical example.** Before work, someone opens the required section while connected. Later, they restart the phone and the app requests another sign-in. The first check demonstrated access to an already open screen, but did not test launching in a new session. That is why it helps to close and reopen the app without connectivity, then repeat the check after restarting the device.

The developer faces a trade-off: access restrictions protect sensitive information but may impede use without connectivity. The decision should reflect the function's purpose and the nature of the data. A public reference and access to patient records do not necessarily need the same sign-in conditions.

Weak connectivity also matters. An app may wait a long time for a server response despite having the necessary local copy. To the user, this looks like unavailability. Prepared offline access should remain understandable when a network icon is visible but the server does not respond.

## Available information and current information

A local copy provides availability. Whether it is up to date is another question. If a device cannot contact the update source, it cannot confirm that nothing has changed since its last check.

For a reference or protocol, I suggest distinguishing four labels:

* **App version** — which software is installed.
* **Data or protocol version** — which edition of the materials the function uses.
* **Source date** — when the underlying document was issued or updated.
* **Last successful update check** — when the app was able to check for a newer edition.

An installation or download date does not replace the source date. An unsuccessful connection attempt should not appear to be a successful freshness check. If individual materials are updated independently, one date for the entire reference may not be sufficiently informative.

A clear status might read: “A saved edition is available. Updates cannot be checked right now because there is no connection.” The source, content version and date of the last successful update check should be shown alongside it. This is an author-proposed example of a message, rather than a description of an S-Dose screen.

Currency cannot be determined solely by a file's age. A recommendation may remain applicable for a long time, while an error in a new edition may require rapid correction. A universal rule such as “everything remains valid for six months” conceals differences between sources, their changes and the information's intended use.

For medical material, provenance and context also matter: which audience and circumstances the source addresses, and which adaptations have been made. A correct date does not, by itself, establish that a recommendation applies to a particular situation.

## An update should leave a clear working state

Updating an app and updating its reference are different actions. In one tool, materials change only when a new app version is installed. In another, they are downloaded separately. The first approach simplifies release coordination but ties content changes to software updates; the second allows independent content changes but requires compatibility checks.

For a separate package, the sequence needs planning: download it to a temporary location, verify it, and only then activate it. If connectivity disappears halfway through, the partially downloaded package should not silently replace the working copy.

This is the idea of an **atomic change**: a related update is applied completely or not applied. SQLite describes mechanisms for atomic transaction completion and recovery after interruption [3]. A transaction is a group of changes that a database treats as a single unit. However, using a database does not automatically organise the entire update process: separate files, search data and calculation logic also need to remain consistent.

#### Integrity, provenance and compatibility

Integrity means that a file was received completely and matches its expected contents. A cryptographic hash — a calculated “fingerprint” of the file — can help check this. However, a hash obtained with the file from an unverified source does not establish who published it.

Provenance requires a trusted basis for verification. For example, a digital signature allows a package to be checked against a key the app already trusts. The Update Framework describes signed metadata, hashes and versions used to protect updates [4]. This provides a technical basis for the explanation, rather than a requirement for every medical tool to implement that particular framework.

Compatibility answers a third question: does the installed software interpret the new data correctly? **Hypothetical example:** a package uses a new unit of measurement that an older calculator's logic interprets differently. The file may be complete and authentic but unsuitable for that version of the calculation. Signature verification therefore does not replace checks of format, units, dependencies and processing rules.

Recovery also needs planning: which copy remains after an unsuccessful update, whether downloading can be retried, and how users learn that changes were not applied. During a calculation already in progress, it is preferable to retain a defined rule version or explicitly offer recalculation after the rules change.

#### When an older version has a known critical error

A previously verified copy can help when a new download fails technically. But if that copy has a known critical error, automatically returning to it requires a different decision.

I suggest considering this at the level of the affected function. An error that could change a calculation result may require a clear warning, a restriction or disabling that calculation until corrected. The message should explain what is affected and what action is needed. The consequences of the error determine the response; a generic “outdated version” banner may not convey the problem.

There is also a fundamental limit: a disconnected device will not receive notification of an error discovered after connectivity was lost. Available ways to inform users, and the tool's behaviour after receiving that notification, should therefore be planned beforehand. Arbitrarily blocking all older materials by calendar date does not resolve this problem.

## Local data needs its own plan

A public reference and personal records create different requirements. For a reference, availability, provenance and consistency matter. Records add questions about access, confidentiality, recovery and deletion.

Offline operation does not, by itself, guarantee confidentiality. OWASP MASVS-STORAGE addresses protection of sensitive stored data and prevention of leaks, including through logs and backups [5]. For a particular tool, the starting point is understanding which data is stored and who can obtain it.

Reliable records also depend on when a “saved” message appears. Entering text on a screen does not mean it has been written to storage. If saving fails, for example because storage is full, users should see the error and be able to save their input after it is resolved. Changes to the storage structure also need testing: do existing records remain accessible after an app version change?

Data minimisation is a useful first step: does the stated function need a name, full identifiers or other personal details? If the task can be completed without them, collecting them adds responsibility without an obvious benefit.

Next come access protection for the device and app, encryption where needed, and protection of the keys that make encrypted data readable. Encryption does not protect information from someone using an already open screen of records. Ease of access and protection need to be considered together.

Backups reduce the risk of loss but create another copy of the information. Android's backup guidance explains how protection depends on platform versions and configuration, and the risks of exporting to directories accessible to other apps [6]. Users need to know what is copied, where it goes, who has access and whether restoration has been tested.

Keeping records only on a phone leaves a risk of device loss or damage. If remote locking or deletion requires connectivity, it may not happen immediately. Deleting a record on the device also does not automatically delete copies from backups or a server. These rules should be explained according to the tool's actual features.

## Connectivity returning is a separate stage

For a simple local reference, reconnecting may mean only checking for updates. It does not need personal record synchronisation if it has no such records.

For a tool that exchanges records, distinguish “saved on this device” from “transferred and acknowledged by the other system.” This helps users understand whether their work remains only local.

**Hypothetical example.** Two users change the same record while disconnected. After reconnection, automatically accepting the latest change may hide the other user's correction. In another situation, the server accepts a record but its acknowledgement never reaches the phone. Resending can create a duplicate unless the system recognises the same action.

I suggest providing recognition of repeated submissions, a history of important changes and explicit conflict handling where conflicts are possible. The reconciliation rule depends on the type of record: adding a separate event and editing an existing value do not necessarily need the same treatment. An automatic decision is appropriate only when its consequences for the data are understood.

## Test a completed action, not just an open screen

A practical check begins with the required function: finding a reference, performing a calculation or saving a record. Define the conditions and expected outcome before testing. Then check whether the result remains available after closing and reopening the app.

Basic scenarios include launching without a network, restarting the app and phone, missing local material, an interrupted update and reconnection. Where the corresponding features exist, add session expiry, repeated submission, conflicting records and backup restoration. Developers can also test low storage, rejection of corrupted or incompatible packages, and notification of a known error.

These checks should use test data. Connectivity loss or interrupted updates should not be deliberately introduced while providing care or on the only copy of important records.

A successful technical test establishes behaviour only under the tested conditions. **Clinical correctness of the reference and calculations requires a separate check**: agreement with the source, units, input assumptions, limits and expected results. A calculator can operate perfectly without connectivity while applying an incorrect rule.

## What should you ask about “works offline”?

Choose the questions relevant to your tool and check the functions you need, or ask the developer to clarify how they work.

1. Which actions are available without connectivity: reading, search, calculations and saving?
2. What must be installed, opened, downloaded or authenticated beforehand?
3. Do the required functions work after restarting the app and device? What happens when a session expires?
4. How can users see which materials are stored locally and which are missing?
5. Where are the app version, data edition, source date and last successful update check shown?
6. What remains available after an interrupted or failed update? How can you tell whether it has completed?
7. How are users informed of a known critical error, and what happens to the affected function afterwards?
8. If there are personal records, what is stored and how is it protected, backed up, restored and deleted?
9. If synchronisation exists, how is completed transfer shown and how are duplicates and conflicts handled?
10. Which offline scenarios have been tested, on which versions and devices, and how was the medical content checked separately?

Thoughtful offline operation makes a tool's dependencies understandable. Users know what is available, what to prepare, which edition they are using and whether a result has been saved. Developers have defined behaviour for failure and recovery.

>**A useful offline function lets users complete the required action and understand its result, even when checking for updates or transferring data is currently impossible.**

That specificity helps people choose medical tools for unreliable connectivity and discuss their capabilities without excessive promises.

## Sources

1. Google, Android Developers. [**Build an offline-first app**](https://developer.android.com/topic/architecture/data-layer/offline-first). Page updated **13 May 2026**. The description of local and network sources and separate read and write strategies was checked. Scope: Android app architecture.
2. Google, Android Developers. [**Access app-specific files**](https://developer.android.com/training/data-storage/app-specific). Page updated **1 October 2026**. File storage and cache sections checked, including possible cache removal when storage is low. Scope: Android; other platforms' behaviour should be checked against their documentation.
3. SQLite. [**Atomic Commit In SQLite**](https://www.sqlite.org/atomiccommit.html). Current online documentation, covering atomic commit, recovery and limitations. Used to explain a technical principle, rather than demonstrate a particular app's reliability.
4. The Update Framework. [**The Update Framework Specification**](https://theupdateframework.github.io/specification/latest/). Current online specification, with sections on signed metadata, hashes and the update verification process. Scope: technical protection of update delivery, rather than verification of medical content.
5. OWASP Mobile Application Security. [**MASVS-STORAGE: Storage**](https://mas.owasp.org/MASVS/05-MASVS-STORAGE/). Current online edition; MASVS-STORAGE-1, MASVS-STORAGE-2 and the description of local storage risks checked. Scope: mobile application security.
6. Google, Android Developers. [**Security recommendations for backups**](https://developer.android.com/privacy-and-security/risks/backup-best-practices). Page updated **25 October 2024**. The overview of backup, protection settings and export risks was checked. Scope: Android.

Links and the cited sections were checked on 3 October 2026. This article discusses technical and organisational decisions; it does not establish S-Dose's regulatory status or conformity with any standards.
