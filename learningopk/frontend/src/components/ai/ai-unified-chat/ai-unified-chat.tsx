'use client';

import { AIChatProvider, useAIChatContext } from './ai-chat-context';
import { AIChatSidebar } from './ai-chat-sidebar';
import { AIChatDrawer } from './ai-chat-drawer';
import { AIChatToggleButton } from './ai-chat-toggle-button';
import { useAIContextSync } from './hooks/use-ai-context';
import type { AIContext } from './types';

type AIUnifiedChatProps = {
  context?: AIContext | null;
};

function AIUnifiedChatInner({ context }: { context?: AIContext | null }) {
  const { toggleVisibility } = useAIChatContext();

  useAIContextSync(context ?? null);
  
  return (
    <>
      <AIChatToggleButton />
      
      <AIChatSidebar onHide={toggleVisibility} />
      
      <AIChatDrawer onClose={toggleVisibility} />
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
