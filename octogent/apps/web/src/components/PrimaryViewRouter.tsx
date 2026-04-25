import { type ComponentProps, type ReactNode, Suspense, lazy } from "react";

import type { PrimaryNavIndex } from "../app/constants";
import type { UseMonitorRuntimeResult } from "../app/hooks/useMonitorRuntime";
import { ActivityPrimaryView } from "./ActivityPrimaryView";
import { CanvasPrimaryView } from "./CanvasPrimaryView";
import { DeckPrimaryView } from "./DeckPrimaryView";

const CodeIntelPrimaryView = lazy(() =>
  import("./CodeIntelPrimaryView").then((m) => ({ default: m.CodeIntelPrimaryView })),
);
const MonitorPrimaryView = lazy(() =>
  import("./MonitorPrimaryView").then((m) => ({ default: m.MonitorPrimaryView })),
);
const ConversationsPrimaryView = lazy(() =>
  import("./ConversationsPrimaryView").then((m) => ({ default: m.ConversationsPrimaryView })),
);
const PromptsPrimaryView = lazy(() =>
  import("./PromptsPrimaryView").then((m) => ({ default: m.PromptsPrimaryView })),
);
const SettingsPrimaryView = lazy(() =>
  import("./SettingsPrimaryView").then((m) => ({ default: m.SettingsPrimaryView })),
);

type PrimaryViewRouterProps = {
  activePrimaryNav: PrimaryNavIndex;
  deckPrimaryViewProps: ComponentProps<typeof DeckPrimaryView>;
  isMonitorVisible: boolean;
  activityPrimaryViewProps: ComponentProps<typeof ActivityPrimaryView>;
  settingsPrimaryViewProps: ComponentProps<typeof SettingsPrimaryView>;
  canvasPrimaryViewProps: ComponentProps<typeof CanvasPrimaryView>;
  monitorRuntime: Pick<
    UseMonitorRuntimeResult,
    | "monitorConfig"
    | "monitorFeed"
    | "monitorError"
    | "isRefreshingMonitorFeed"
    | "isSavingMonitorConfig"
    | "refreshMonitorFeed"
    | "patchMonitorConfig"
  >;
  conversationsEnabled: boolean;
  onConversationsSidebarContent: (content: ReactNode) => void;
  onConversationsActionPanel: (content: ReactNode) => void;
  promptsEnabled: boolean;
  onPromptsSidebarContent: (content: ReactNode) => void;
};

export const PrimaryViewRouter = ({
  activePrimaryNav,
  deckPrimaryViewProps,
  isMonitorVisible,
  activityPrimaryViewProps,
  settingsPrimaryViewProps,
  canvasPrimaryViewProps,
  monitorRuntime,
  conversationsEnabled,
  onConversationsSidebarContent,
  onConversationsActionPanel,
  promptsEnabled,
  onPromptsSidebarContent,
}: PrimaryViewRouterProps) => {
  if (activePrimaryNav === 2) {
    return <DeckPrimaryView {...deckPrimaryViewProps} />;
  }

  if (activePrimaryNav === 3) {
    return <ActivityPrimaryView {...activityPrimaryViewProps} />;
  }

  if (activePrimaryNav === 4) {
    return (
      <Suspense fallback={null}>
        <CodeIntelPrimaryView enabled={activePrimaryNav === 4} />
      </Suspense>
    );
  }

  if (activePrimaryNav === 5) {
    if (isMonitorVisible) {
      return (
        <Suspense fallback={null}>
          <MonitorPrimaryView monitorRuntime={monitorRuntime} />
        </Suspense>
      );
    }
    return (
      <section className="monitor-view" aria-label="Monitor primary view disabled">
        <section className="monitor-panel monitor-panel--configure">
          <h3>Monitor is disabled</h3>
          <p>Enable Monitor workspace view in Settings to restore this panel.</p>
        </section>
      </section>
    );
  }

  if (activePrimaryNav === 6) {
    return (
      <Suspense fallback={null}>
        <ConversationsPrimaryView
          enabled={conversationsEnabled}
          onSidebarContent={onConversationsSidebarContent}
          onActionPanel={onConversationsActionPanel}
        />
      </Suspense>
    );
  }

  if (activePrimaryNav === 7) {
    return (
      <Suspense fallback={null}>
        <PromptsPrimaryView enabled={promptsEnabled} onSidebarContent={onPromptsSidebarContent} />
      </Suspense>
    );
  }

  if (activePrimaryNav === 8) {
    return (
      <Suspense fallback={null}>
        <SettingsPrimaryView {...settingsPrimaryViewProps} />
      </Suspense>
    );
  }

  return <CanvasPrimaryView {...canvasPrimaryViewProps} />;
};
