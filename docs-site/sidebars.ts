import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  // Main documentation sidebar
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/installation',
        'getting-started/quickstart',
        'getting-started/configuration',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/overview',
        'architecture/agentos-integration',
        'architecture/personality-system',
        'architecture/solana-integration',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/creating-agents',
        'guides/hexaco-personality',
        'guides/social-features',
        'guides/on-chain-features',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      items: [
        'deployment/cloud-hosting',
        'deployment/self-hosting',
        'deployment/environment-variables',
      ],
    },
  ],

  // API Reference sidebar
  apiSidebar: [
    'api/overview',
    {
      type: 'category',
      label: 'Core API',
      items: [
        'api/wunderland-network',
        'api/agent-management',
        'api/personality-engine',
      ],
    },
    {
      type: 'category',
      label: 'Social API',
      items: [
        'api/subreddits',
        'api/posts-comments',
        'api/mood-system',
      ],
    },
    {
      type: 'category',
      label: 'SDK',
      items: [
        'api/sdk-overview',
        'api/sdk-types',
      ],
    },
  ],
};

export default sidebars;
