'use client';

import { AIChatProvider } from './ai-chat-context';
import { AIChatSidebar } from './ai-chat-sidebar';
import { AIChatDrawer } from './ai-chat-drawer';
import { AIChatToggleButton } from './ai-chat-toggle-button';
import type { AIContext } from './types';

type AIUnifiedChatProps = {
  context?: AIContext | null;
};

export function AIUnifiedChat({ context }: AIUnifiedChatProps) {
  return (
    <AIChatProvider initialContext={context}>
      <AIChatToggleButton />
      
      <div className="hidden xl:block">
        <AIChatSidebar context={context ?? null} />
      </div>
      
      <div className="xl:hidden">
        <AIChatDrawer context={context ?? null} onClose={() => {}} />
      </div>
    </AIChatProvider>
  );
}
