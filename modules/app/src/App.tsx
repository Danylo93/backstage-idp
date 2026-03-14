import { Navigate, Route } from 'react-router-dom';
import { apiDocsPlugin, ApiExplorerPage } from '@backstage/plugin-api-docs';
import {
  CatalogEntityPage,
  CatalogIndexPage,
  catalogPlugin,
} from '@backstage/plugin-catalog';
import {
  CatalogImportPage,
  catalogImportPlugin,
} from '@backstage/plugin-catalog-import';
import { ScaffolderPage, scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { orgPlugin } from '@backstage/plugin-org';
import {
  TechDocsIndexPage,
  techdocsPlugin,
  TechDocsReaderLayout,
  TechDocsReaderPage,
} from '@backstage/plugin-techdocs';
import { TechDocsAddons } from '@backstage/plugin-techdocs-react';
import { ReportIssue } from '@backstage/plugin-techdocs-module-addons-contrib';
import { apis } from './apis';
import { ShieldSignInPage } from './components/auth/ShieldSignInPage';
import { entityPage } from './components/catalog/EntityPage';
import { HomePage } from './components/home/HomePage';
import { PlatformPageLayout } from './components/layout/PlatformPageLayout';
import { Root } from './components/Root';
import { ShieldTaskPage } from './components/scaffolder/ShieldTaskPage';
import { ShieldSettingsPage } from './components/settings/ShieldSettingsPage';
import { shieldThemes } from './theme';

import {
  AlertDisplay,
  OAuthRequestDialog,
} from '@backstage/core-components';
import { createApp } from '@backstage/app-defaults';
import { AppRouter, FlatRoutes } from '@backstage/core-app-api';
import {
  CatalogGraphPage,
  catalogGraphPlugin,
} from '@backstage/plugin-catalog-graph';
import { RequirePermission } from '@backstage/plugin-permission-react';
import { catalogEntityCreatePermission } from '@backstage/plugin-catalog-common/alpha';

const app = createApp({
  apis,
  themes: shieldThemes,
  bindRoutes({ bind }) {
    bind(catalogPlugin.externalRoutes, {
      createComponent: scaffolderPlugin.routes.root,
      viewTechDoc: techdocsPlugin.routes.docRoot,
      createFromTemplate: scaffolderPlugin.routes.selectedTemplate,
    });
    bind(apiDocsPlugin.externalRoutes, {
      registerApi: catalogImportPlugin.routes.importPage,
    });
    bind(scaffolderPlugin.externalRoutes, {
      registerComponent: catalogImportPlugin.routes.importPage,
      viewTechDoc: techdocsPlugin.routes.docRoot,
    });
    bind(orgPlugin.externalRoutes, {
      catalogIndex: catalogPlugin.routes.catalogIndex,
    });
    bind(catalogGraphPlugin.externalRoutes, {
      catalogEntity: catalogPlugin.routes.catalogEntity,
    });
  },
  components: {
    SignInPage: props => <ShieldSignInPage {...props} />,
  },
});

const routes = (
  <FlatRoutes>
    <Route path="/" element={<HomePage />} />
    <Route path="/home" element={<Navigate to="/" />} />
    <Route
      path="/catalog"
      element={
        <PlatformPageLayout
          pageClassName="shield-catalog-page"
          eyebrow="Catalogo"
          title="Todos os Componentes"
          subtitle="Visualize ownership, sistemas, componentes, squads e relacoes da plataforma em um catalogo unico."
          chips={['Componentes', 'Systems', 'Squads']}
        >
          <CatalogIndexPage
            initiallySelectedFilter="all"
            ownerPickerMode="all"
            pagination
          />
        </PlatformPageLayout>
      }
    />
    <Route
      path="/squads"
      element={
        <PlatformPageLayout
          pageClassName="shield-squads-page"
          eyebrow="Ownership"
          title="Squads e Times"
          subtitle="Visualize squads, times administrativos e ownership organizacional da plataforma em uma visao dedicada."
          chips={['Squads', 'Teams', 'Ownership']}
        >
          <CatalogIndexPage
            initiallySelectedFilter="all"
            ownerPickerMode="all"
            initialKind="group"
            pagination
          />
        </PlatformPageLayout>
      }
    />
    <Route
      path="/catalog/:namespace/:kind/:name"
      element={<CatalogEntityPage />}
    >
      {entityPage}
    </Route>
    <Route
      path="/docs"
      element={
        <PlatformPageLayout
          pageClassName="shield-docs-page"
          eyebrow="TechDocs"
          title="Base de Conhecimento"
          subtitle="Documentacao operacional, onboarding, padroes de plataforma e guias de evolucao centralizados no SHIELD."
          chips={['Onboarding', 'Padroes', 'Runbooks']}
        >
          <TechDocsIndexPage ownerPickerMode="all" />
        </PlatformPageLayout>
      }
    />
    <Route
      path="/docs/:namespace/:kind/:name/*"
      element={
        <TechDocsReaderPage>
          <TechDocsReaderLayout withSearch={false} />
        </TechDocsReaderPage>
      }
    >
      <TechDocsAddons>
        <ReportIssue />
      </TechDocsAddons>
    </Route>
    <Route
      path="/create"
      element={
        <div className="shield-scaffolder-shell shield-scaffolder-shell--list">
          <PlatformPageLayout
            pageClassName="shield-templates-page shield-scaffolder-shell__layout"
            eyebrow="Scaffolder"
            title="Templates Oficiais"
            subtitle="Crie repositorios, pipelines, policies e bootstrap GitOps usando os templates homologados da plataforma."
            chips={['Java', '.NET', 'Python']}
          >
            <ScaffolderPage
              components={{
                TaskPageComponent: ShieldTaskPage,
              }}
            />
          </PlatformPageLayout>
        </div>
      }
    />
    <Route
      path="/api-docs"
      element={
        <PlatformPageLayout
          pageClassName="shield-api-page"
          eyebrow="APIs"
          title="Contratos e Integracoes"
          subtitle="Explore APIs registradas, ownership e relacionamentos entre servicos e contratos publicados na plataforma."
          chips={['OpenAPI', 'Ownership', 'Consumers']}
        >
          <ApiExplorerPage pagination ownerPickerMode="all" />
        </PlatformPageLayout>
      }
    />
    <Route
      path="/catalog-import"
      element={
        <PlatformPageLayout
          pageClassName="shield-register-page"
          eyebrow="Cadastro"
          title="Registrar Componente"
          subtitle="Conecte um repositorio ou entity file existente para colocar o componente sob monitoramento e governanca da SHIELD Platform."
          chips={['Catalogo', 'Importacao', 'Tracking']}
        >
          <RequirePermission permission={catalogEntityCreatePermission}>
            <CatalogImportPage />
          </RequirePermission>
        </PlatformPageLayout>
      }
    />
    <Route
      path="/settings"
      element={<ShieldSettingsPage />}
    />
    <Route
      path="/catalog-graph"
      element={
        <PlatformPageLayout
          pageClassName="shield-topology-page"
          eyebrow="Topologia"
          title="Mapa da Plataforma"
          subtitle="Navegue pelas dependencias e relacoes entre componentes, APIs, systems, domains e recursos operacionais."
          chips={['Dependencias', 'APIs', 'Resources']}
        >
          <CatalogGraphPage
            initialState={{
              selectedKinds: [
                'component',
                'api',
                'resource',
                'system',
                'domain',
                'group',
              ],
              showFilters: true,
            }}
          />
        </PlatformPageLayout>
      }
    />
  </FlatRoutes>
);

export default app.createRoot(
  <>
    <AlertDisplay />
    <OAuthRequestDialog />
    <AppRouter>
      <Root>{routes}</Root>
    </AppRouter>
  </>,
);
