export const offlineSyncPolicy = {
  issue: 447,
  task: 35,
  parentIssue: 412,
  targetVersion: "1.1.0",
  targetBranch: "version/web/1.1.0",
  policy: "online-core",
  queueEnabled: false,
  queueName: null,
  noSilentWrites: true,
  reconnectEvent: "bookgolas:online-reconnected",
  retryOnReconnect: true,
  localDraftMutations: ["review"],
  onlineOnlyMutations: [
    "progress",
    "book-metadata",
    "book-status",
    "notes-highlights",
    "timer",
    "images-ocr",
    "ai",
    "web-push",
    "account",
  ],
} as const;

export type OfflineMutationId =
  | (typeof offlineSyncPolicy.onlineOnlyMutations)[number]
  | (typeof offlineSyncPolicy.localDraftMutations)[number];

export type OfflineMutationDecision = {
  accepted: false;
  queued: false;
  retryable: true;
  state: "offline";
  mutation: OfflineMutationId;
  preservation: "local-draft" | "none";
};

export function getOfflineMutationDecision(
  mutation: OfflineMutationId,
): OfflineMutationDecision {
  return {
    accepted: false,
    queued: false,
    retryable: true,
    state: "offline",
    mutation,
    preservation: mutation === "review" ? "local-draft" : "none",
  };
}

export function isOnlineOnlyMutation(mutation: string): mutation is OfflineMutationId {
  return (offlineSyncPolicy.onlineOnlyMutations as readonly string[]).includes(mutation);
}

export function isLocalDraftMutation(mutation: string): mutation is OfflineMutationId {
  return (offlineSyncPolicy.localDraftMutations as readonly string[]).includes(mutation);
}

export function getReconnectAnnouncement() {
  return {
    event: offlineSyncPolicy.reconnectEvent,
    retryable: offlineSyncPolicy.retryOnReconnect,
    queueFlushed: false,
  } as const;
}
