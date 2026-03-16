import { useEffect, useMemo, useState } from 'react';
import AppsRoundedIcon from '@material-ui/icons/AppsRounded';
import DeviceHubRoundedIcon from '@material-ui/icons/DeviceHubRounded';
import ExtensionRoundedIcon from '@material-ui/icons/ExtensionRounded';
import FlashOnRoundedIcon from '@material-ui/icons/FlashOnRounded';
import LayersRoundedIcon from '@material-ui/icons/LayersRounded';
import MemoryRoundedIcon from '@material-ui/icons/MemoryRounded';
import SecurityRoundedIcon from '@material-ui/icons/SecurityRounded';
import SettingsEthernetRoundedIcon from '@material-ui/icons/SettingsEthernetRounded';
import StorageRoundedIcon from '@material-ui/icons/StorageRounded';
import GroupWorkRoundedIcon from '@material-ui/icons/GroupWorkRounded';
import AddRoundedIcon from '@material-ui/icons/AddRounded';
import { useApi } from '@backstage/core-plugin-api';
import { CatalogIndexPage } from '@backstage/plugin-catalog';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Entity } from '@backstage/catalog-model';
import {
  CommandDeckCard,
  CommandDeckLegend,
  CommandDeckPage,
  CommandDeckStat,
} from '../layout/CommandDeckPage';

type CatalogSnapshot = {
  entities: Entity[];
  facets: Record<string, Array<{ value: string; count: number }>>;
  loading: boolean;
};

const getEntityTitle = (entity: Entity) =>
  entity.metadata.title || entity.metadata.name || 'Ativo sem nome';

const getEntityDescription = (entity: Entity) =>
  entity.metadata.description ||
  'Item sincronizado do catalogo operacional da plataforma.';

const truncate = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;

const toEntityLink = (entity: Entity) => {
  const namespace = entity.metadata.namespace ?? 'default';
  const kind = entity.kind.toLowerCase();
  const name = encodeURIComponent(entity.metadata.name);

  return `/catalog/${namespace}/${kind}/${name}`;
};

const getLifecycleTone = (entity: Entity) => {
  const lifecycle = String(entity.spec?.lifecycle ?? '').toLowerCase();

  if (lifecycle.includes('prod') || lifecycle.includes('stable')) {
    return 'success' as const;
  }

  if (lifecycle.includes('deprecated') || lifecycle.includes('sunset')) {
    return 'alert' as const;
  }

  if (lifecycle.includes('experimental') || lifecycle.includes('beta')) {
    return 'warning' as const;
  }

  return 'info' as const;
};

const getEntityIcon = (entity: Entity) => {
  const kind = entity.kind.toLowerCase();
  const entityType = String(entity.spec?.type ?? '').toLowerCase();

  if (kind === 'api') {
    return <ExtensionRoundedIcon fontSize="large" />;
  }

  if (entityType.includes('website') || entityType.includes('frontend')) {
    return <LayersRoundedIcon fontSize="large" />;
  }

  if (entityType.includes('database')) {
    return <StorageRoundedIcon fontSize="large" />;
  }

  if (entityType.includes('worker') || entityType.includes('job')) {
    return <FlashOnRoundedIcon fontSize="large" />;
  }

  if (entityType.includes('service')) {
    return <SettingsEthernetRoundedIcon fontSize="large" />;
  }

  if (kind === 'system') {
    return <DeviceHubRoundedIcon fontSize="large" />;
  }

  if (kind === 'group') {
    return <GroupWorkRoundedIcon fontSize="large" />;
  }

  if (entityType.includes('library')) {
    return <MemoryRoundedIcon fontSize="large" />;
  }

  return <SecurityRoundedIcon fontSize="large" />;
};

const getFacetCount = (
  facets: Record<string, Array<{ value: string; count: number }>>,
  facetName: string,
  key: string,
) =>
  facets[facetName]?.find(item => item.value.toLowerCase() === key.toLowerCase())?.count ?? 0;

const fallbackCards: CommandDeckCard[] = [
  {
    id: 'catalog-fallback-1',
    title: 'Inventario central',
    eyebrow: 'Inventario de ativos',
    description:
      'Sincronizando componentes e servicos da plataforma para preencher a visao operacional.',
    icon: <AppsRoundedIcon fontSize="large" />,
    badgeLabel: 'SINCRONIZANDO',
    badgeTone: 'info',
    meta: [
      { label: 'Owner', value: 'Plataforma' },
      { label: 'Tipo', value: 'Componentes' },
      { label: 'Status', value: 'Sincronizando' },
      { label: 'Escopo', value: 'Catalogo' },
    ],
    tags: ['Inventario', 'Operacoes'],
    tone: 'info',
    to: '/catalog',
    ctaLabel: 'Abrir catalogo',
  },
  {
    id: 'catalog-fallback-2',
    title: 'Topologia viva',
    eyebrow: 'Grafo de dependencias',
    description:
      'Enquanto os dados carregam, voce ainda pode navegar pelas dependencias e relacoes operacionais.',
    icon: <DeviceHubRoundedIcon fontSize="large" />,
    badgeLabel: 'MAPA',
    badgeTone: 'success',
    meta: [
      { label: 'Owner', value: 'Arquitetura' },
      { label: 'Tipo', value: 'Mapa' },
      { label: 'Status', value: 'Ativo' },
      { label: 'Escopo', value: 'Sistemas' },
    ],
    tags: ['Sistemas', 'Dependencias'],
    tone: 'success',
    to: '/catalog-graph',
    ctaLabel: 'Abrir topologia',
  },
];

export const AssetCatalogPage = () => {
  const catalogApi = useApi(catalogApiRef);
  const [snapshot, setSnapshot] = useState<CatalogSnapshot>({
    entities: [],
    facets: {},
    loading: true,
  });

  useEffect(() => {
    let active = true;

    async function loadCatalogSnapshot() {
      try {
        const [entitiesResponse, facetsResponse] = await Promise.all([
          catalogApi.getEntities({
            filter: { kind: 'Component' },
            limit: 5,
            order: [{ field: 'metadata.name', order: 'asc' }],
          }),
          catalogApi.getEntityFacets({
            facets: ['kind'],
            filter: { kind: ['Component', 'API', 'System', 'Group'] },
          }),
        ]);

        if (!active) {
          return;
        }

        setSnapshot({
          entities: entitiesResponse.items,
          facets: facetsResponse.facets,
          loading: false,
        });
      } catch {
        if (!active) {
          return;
        }

        setSnapshot(current => ({
          ...current,
          loading: false,
        }));
      }
    }

    void loadCatalogSnapshot();

    return () => {
      active = false;
    };
  }, [catalogApi]);

  const cards = useMemo<CommandDeckCard[]>(() => {
    if (!snapshot.entities.length) {
      return fallbackCards;
    }

    return snapshot.entities.map(entity => {
      const owner = String(entity.spec?.owner ?? 'Nao definido');
      const system = String(entity.spec?.system ?? entity.metadata.namespace ?? 'default');
      const entityType = String(entity.spec?.type ?? entity.kind);
      const lifecycle = String(entity.spec?.lifecycle ?? 'ativo');
      const tone = getLifecycleTone(entity);

      return {
        id: entity.metadata.uid || entity.metadata.name,
        title: getEntityTitle(entity),
        eyebrow: entityType,
        description: truncate(getEntityDescription(entity), 148),
        icon: getEntityIcon(entity),
        tone,
        badgeLabel: lifecycle.toUpperCase(),
        badgeTone: tone,
        meta: [
          { label: 'Owner', value: owner },
          { label: 'System', value: system },
          { label: 'Tipo', value: entityType },
          { label: 'Namespace', value: entity.metadata.namespace ?? 'default' },
        ],
        tags: entity.metadata.tags?.slice(0, 3) ?? [],
        to: toEntityLink(entity),
        ctaLabel: 'Inspecionar componente',
      };
    });
  }, [snapshot.entities]);

  const stats = useMemo<CommandDeckStat[]>(() => {
    if (snapshot.loading) {
      return [
        { label: 'Componentes', value: '--' },
        { label: 'APIs', value: '--' },
        { label: 'Sistemas', value: '--' },
        { label: 'Squads', value: '--' },
      ];
    }

    return [
      {
        label: 'Componentes',
        value: String(getFacetCount(snapshot.facets, 'kind', 'component')),
        tone: 'info',
      },
      {
        label: 'APIs',
        value: String(getFacetCount(snapshot.facets, 'kind', 'api')),
        tone: 'success',
      },
      {
        label: 'Sistemas',
        value: String(getFacetCount(snapshot.facets, 'kind', 'system')),
        tone: 'warning',
      },
      {
        label: 'Squads',
        value: String(getFacetCount(snapshot.facets, 'kind', 'group')),
        tone: 'alert',
      },
    ];
  }, [snapshot.facets, snapshot.loading]);

  const legend = useMemo<CommandDeckLegend[]>(() => {
    return [
      {
        label: 'componentes',
        value: String(getFacetCount(snapshot.facets, 'kind', 'component') || 0),
        tone: 'info',
      },
      {
        label: 'apis',
        value: String(getFacetCount(snapshot.facets, 'kind', 'api') || 0),
        tone: 'success',
      },
      {
        label: 'sistemas',
        value: String(getFacetCount(snapshot.facets, 'kind', 'system') || 0),
        tone: 'warning',
      },
    ];
  }, [snapshot.facets]);

  return (
    <CommandDeckPage
      pageClassName="shield-catalog-page shield-command-deck-page"
      statusLabel="Status: inventario em tempo real"
      title="Catalogo de Ativos"
      subtitle="Visao autorizada dos componentes, APIs, governanca e sistemas operacionais registrados na plataforma."
      actions={[
        {
          label: 'Abrir topologia',
          to: '/catalog-graph',
          icon: <DeviceHubRoundedIcon />,
          variant: 'secondary',
        },
        {
          label: 'Registrar componente',
          to: '/catalog-import',
          icon: <AddRoundedIcon />,
          variant: 'primary',
        },
      ]}
      stats={stats}
      cards={cards}
      callout={{
        title: 'Inicializar novo ativo',
        description:
          'Conecte um repositorio existente ou crie um novo componente para colocar o ativo sob governanca.',
        label: 'Abrir cadastro',
        to: '/catalog-import',
        icon: <AddRoundedIcon fontSize="large" />,
      }}
      feedEyebrow="Feed diagnostico detalhado"
      feedTitle="Inventario operacional"
      feedSubtitle="Continue usando filtros, seletores de ownership e a tabela oficial do Backstage, agora dentro de uma superficie mais orientada a comando."
      legend={legend}
    >
      <CatalogIndexPage initiallySelectedFilter="all" ownerPickerMode="all" pagination />
    </CommandDeckPage>
  );
};
