# ADR 0008: Optional email and explicit password rules

Status: accepted. Amends [ADR 0007](0007-first-party-username-auth.md).

Registration collects only a username and a password. ADR 0007 required an email address at signup so that password reset was always possible; that made the shortest path into the product longer than it needs to be, and the confirm-password field added a second place to mistype without catching a wrong-but-consistent password.

`users.email` is therefore nullable. An account with no address cannot reset its password — this is a real hazard, not an oversight, so it is surfaced twice: a banner on the home page for any signed-in account without a verified address, and `/account`, where the address can be added or changed at any time. Setting or changing an address always resets verification.

Password strength moves from a bare 12-character minimum to five explicit rules: at least 8 characters, a lowercase letter, an uppercase letter, a digit and a special character. Whitespace does not count as a special character. The rules live in one exported list that both the Zod schema and the live checklist in the UI are derived from, so the client can never show criteria the server does not enforce. A single validation message names every unmet rule rather than failing one at a time.

The minimum drops from 12 to 8 because the composition rules and the existing per-identity rate limiting carry more of the weight than raw length here, and 12 with no composition requirement was not obviously stronger for the passwords people actually pick.
