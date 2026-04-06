'use client';

import { AIChatProvider, useAIChatContext } from './ai-chat-context';
import { AIChatSidebar } from './ai-chat-sidebar';
import { AIChatDrawer } from './ai-chat-drawer';
import { AIChatFullPage } from './ai-chat-full-page';
import { AIChatToggleButton } from './ai-chat-toggle-button';
import { useAIContextSync } from './hooks/use-ai-context';
import type { AIContext } from './types';

type AIUnifiedChatProps = {
  context?: AIContext | null;
  mode?: 'sidebar' | 'drawer' | 'full-page';
};

function AIUnifiedChatInner({ context, mode = 'sidebar' }: { context?: AIContext | null; mode?: 'sidebar' | 'drawer' | 'full-page' }) {
  const { toggleVisibility } = useAIChatContext();

  useAIContextSync(context ?? null);
  
  if (mode === 'full-page') {
    return <AIChatFullPage />;
  }
  
  return (
    <>
      <AIChatToggleButton />
      
      <AIChatSidebar onHide={toggleVisibility} />
      
      <AIChatDrawer onClose={toggleVisibility} />
    </>
  );
}

export function AIUnifiedChat({ context, mode = 'sidebar' }: AIUnifiedChatProps) {
  return (
    <AIChatProvider initialContext={context}>
      <AIUnifiedChatInner context={context} mode={mode} />
    </AIChatProvider>
  );
}
