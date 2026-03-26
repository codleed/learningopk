'use client';

import { AIChatProvider, useAIChatContext } from './ai-chat-context';
import { AIChatSidebar } from './ai-chat-sidebar';
import { AIChatDrawer } from './ai-chat-drawer';
import { AIChatToggleButton } from './ai-chat-toggle-button';
import type { AIContext } from './types';

type AIUnifiedChatProps = {
  context?: AIContext | null;
};

function AIUnifiedChatInner({ context }: { context?: AIContext | null }) {
  const { toggleVisibility } = useAIChatContext();
  
  return (
    <>
      <AIChatToggleButton />
      
      <div className="hidden xl:block">
        <AIChatSidebar context={context ?? null} />
      </div>
      
      <div className="xl:hidden">
        <AIChatDrawer context={context ?? null} onClose={toggleVisibility} />
      </div>
    </>
  );
}

export function AIUnifiedChat({ context }: AIUnifiedChatProps) {
  return (
    <AIChatProvider initialContext={context}>
      <AIUnifiedChatInner context={context} />
    </AIChatProvider>
  );
}
