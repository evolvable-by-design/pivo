module.exports = {
  title: 'Pivo',
  tagline:
    "Build frontend applications that don't have to be maintained when REST API evolves",
  url: 'https://evolvable-by-design.github.io/',
  baseUrl: '/pivo/',
  favicon: 'img/favicon.ico',
  organizationName: 'evolvable-by-design', // Usually your GitHub org/user name.
  projectName: 'pivo', // Usually your repo name.
  themeConfig: {
    navbar: {
      title: 'Pivo',
      logo: {
        alt: 'Pivo Logo',
        src: 'img/logo.svg'
      },
      links: [
        {
          to: 'docs/introduction',
          activeBasePath: 'docs',
          label: 'Docs',
          position: 'left'
        },
        {
          href: 'https://github.com/evolvable-by-design/pivo',
          label: 'GitHub',
          position: 'right'
        }
      ]
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Introduction',
              to: 'docs/introduction'
            },
            {
              label: 'Getting Started',
              to: 'docs/installation'
            }
          ]
        },
        {
          title: 'Social',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/evolvable-by-design/pivo'
            }
          ]
        }
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Pivo, Inc. Built with Docusaurus.`
    }
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl:
            'https://github.com/evolvable-by-design/pivo/edit/master/website/'
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css')
        }
      }
    ]
  ]
}
