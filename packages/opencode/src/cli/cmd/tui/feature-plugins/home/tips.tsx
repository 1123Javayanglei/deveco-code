import type { TuiPlugin, TuiPluginApi } from '@opencode-ai/plugin/tui';
import type { InternalTuiPlugin } from '../../plugin/internal';
import { createMemo } from 'solid-js';
import { useBindings } from '../../keymap';

const id = 'internal:home-tips';

function TipsToggleBindings(props: { api: TuiPluginApi }) {
  const hidden = createMemo(() => props.api.kv.get('tips_hidden', false));

  useBindings(() => ({
    commands: [
      {
        name: 'tips.toggle',
        title: hidden() ? 'Show tips' : 'Hide tips',
        category: 'System',
        namespace: 'palette',
        run() {
          props.api.kv.set('tips_hidden', !props.api.kv.get('tips_hidden', false));
          props.api.ui.dialog.clear();
        },
      },
    ],
    bindings: props.api.tuiConfig.keybinds.get('tips.toggle'),
  }));

  return null;
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 100,
    slots: {
      app() {
        return <TipsToggleBindings api={api} />;
      },
    },
  });
};

const plugin: InternalTuiPlugin = {
  id,
  tui,
};

export default plugin;
