import { useState } from 'react';
import {
  Container,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Switch,
} from '@material-ui/core';
import { EntityRefLinks } from '@backstage/plugin-catalog-react';
import {
  UserSettingsAuthProviders,
  UserSettingsFeatureFlags,
  UserSettingsMenu,
  UserSettingsPinToggle,
  UserSettingsSignInAvatar,
  UserSettingsThemeToggle,
  useUserProfile,
} from '@backstage/plugin-user-settings';
import { useMenuHoverSoundPreference } from '../../utils/menuHoverSoundPreference';

type SettingsTabKey = 'general' | 'auth' | 'flags';

const tabs: Array<{ key: SettingsTabKey; label: string }> = [
  { key: 'general', label: 'Geral' },
  { key: 'auth', label: 'Provedores de autenticacao' },
  { key: 'flags', label: 'Recursos experimentais' },
];

export const ShieldSettingsPage = () => {
  const [activeTab, setActiveTab] = useState<SettingsTabKey>('general');
  const { profile, backstageIdentity, displayName, loading } = useUserProfile();
  const { menuHoverSoundEnabled, setMenuHoverSoundEnabled } =
    useMenuHoverSoundPreference();

  const identityName =
    displayName || backstageIdentity?.userEntityRef || 'Identidade nao encontrada';
  const ownershipRefs = backstageIdentity?.ownershipEntityRefs ?? [];

  return (
    <div className="shield-settings-page">
      <Container maxWidth="xl" className="shield-preferences">
        <section className="shield-preferences__hero">
          <div className="shield-preferences__heroGlow" />
          <div className="shield-preferences__heroContent">
            <h1 className="shield-preferences__heroTitle">Configuracoes</h1>
            <p className="shield-preferences__heroSubtitle">
              Gerencie preferencias visuais, identidade e configuracoes pessoais do seu
              acesso ao SHIELD.
            </p>
          </div>
        </section>

        <div className="shield-preferences__tabs" role="tablist" aria-label="Preferencias">
          {tabs.map(tab => {
            const selected = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={selected}
                className={`shield-preferences__tab ${
                  selected ? 'shield-preferences__tab--active' : ''
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="shield-preferences__panel">
          {activeTab === 'general' ? (
            <div className="shield-preferences__grid">
              <section className="shield-preferences__card shield-preferences__card--profile">
                <div className="shield-preferences__cardHeader">
                  <span>Perfil</span>
                </div>
                <div className="shield-preferences__cardBody shield-preferences__profileBody">
                  <div className="shield-preferences__profileIdentity">
                    <div className="shield-preferences__avatarShell">
                      <UserSettingsSignInAvatar size={96} />
                    </div>
                    <div className="shield-preferences__profileMeta">
                      <div className="shield-preferences__profileName">
                        {loading ? 'Carregando identidade...' : identityName}
                      </div>
                      {profile.email ? (
                        <div className="shield-preferences__profileEmail">{profile.email}</div>
                      ) : null}
                      <div className="shield-preferences__profileHint">
                        Nivel de acesso: Liberacao nivel 7
                      </div>
                    </div>
                  </div>
                  <div className="shield-preferences__profileAction">
                    <UserSettingsMenu />
                  </div>
                </div>
              </section>

              <section className="shield-preferences__card shield-preferences__card--appearance">
                <div className="shield-preferences__cardHeader">
                  <span>Aparencia</span>
                </div>
                <div className="shield-preferences__cardBody shield-preferences__appearanceBody">
                  <UserSettingsThemeToggle />
                  <UserSettingsPinToggle />
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Som dos menus"
                        secondary="Ativa o efeito sonoro digital ao passar o mouse nos menus da plataforma."
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          edge="end"
                          color="secondary"
                          checked={menuHoverSoundEnabled}
                          onChange={(_, checked) => setMenuHoverSoundEnabled(checked)}
                          inputProps={{
                            'aria-label': 'Ativar ou desativar som dos menus',
                          }}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  </List>
                </div>
              </section>

              <section className="shield-preferences__card shield-preferences__card--identity">
                <div className="shield-preferences__cardHeader">
                  <span>Identidade do Backstage</span>
                </div>
                <div className="shield-preferences__cardBody shield-preferences__identityBody">
                  {backstageIdentity ? (
                    <>
                      <div className="shield-preferences__identityRow">
                        <span className="shield-preferences__identityLabel">Entidade do usuario</span>
                        <div className="shield-preferences__identityValue">
                          <EntityRefLinks entityRefs={[backstageIdentity.userEntityRef]} />
                        </div>
                      </div>
                      <div className="shield-preferences__identityRow">
                        <span className="shield-preferences__identityLabel">Entidades proprietarias</span>
                        <div className="shield-preferences__identityValue">
                          <EntityRefLinks entityRefs={ownershipRefs} />
                        </div>
                      </div>
                      <div className="shield-preferences__identityMeta">
                        <span>{ownershipRefs.length} entidades proprietarias</span>
                        {profile.email ? <span>{profile.email}</span> : null}
                      </div>
                    </>
                  ) : (
                    <div className="shield-preferences__identityEmpty">
                      Identidade do Backstage ainda nao esta disponivel.
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === 'auth' ? (
            <div className="shield-preferences__stack">
              <UserSettingsAuthProviders />
            </div>
          ) : null}

          {activeTab === 'flags' ? (
            <div className="shield-preferences__stack">
              <UserSettingsFeatureFlags />
            </div>
          ) : null}
        </div>

        <footer className="shield-preferences__footer">
          <div className="shield-preferences__footerGroup">
            <span>Status do sistema: Otimo</span>
            <span>Link seguro: Estabelecido</span>
          </div>
          <div className="shield-preferences__footerGroup shield-preferences__footerGroup--right">
            <span>SHIELD OS v1.38.3</span>
          </div>
        </footer>
      </Container>
    </div>
  );
};
