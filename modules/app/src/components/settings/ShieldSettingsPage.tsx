import { useState } from 'react';
import { Container } from '@material-ui/core';
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

type SettingsTabKey = 'general' | 'auth' | 'flags';

const tabs: Array<{ key: SettingsTabKey; label: string }> = [
  { key: 'general', label: 'General' },
  { key: 'auth', label: 'Authentication Providers' },
  { key: 'flags', label: 'Feature Flags' },
];

export const ShieldSettingsPage = () => {
  const [activeTab, setActiveTab] = useState<SettingsTabKey>('general');
  const { profile, backstageIdentity, displayName, loading } = useUserProfile();

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
                  <span>Profile</span>
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
                        Access Level: Level 7 Clearance
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
                  <span>Appearance</span>
                </div>
                <div className="shield-preferences__cardBody shield-preferences__appearanceBody">
                  <UserSettingsThemeToggle />
                  <UserSettingsPinToggle />
                </div>
              </section>

              <section className="shield-preferences__card shield-preferences__card--identity">
                <div className="shield-preferences__cardHeader">
                  <span>Backstage Identity</span>
                </div>
                <div className="shield-preferences__cardBody shield-preferences__identityBody">
                  {backstageIdentity ? (
                    <>
                      <div className="shield-preferences__identityRow">
                        <span className="shield-preferences__identityLabel">User Entity</span>
                        <div className="shield-preferences__identityValue">
                          <EntityRefLinks entityRefs={[backstageIdentity.userEntityRef]} />
                        </div>
                      </div>
                      <div className="shield-preferences__identityRow">
                        <span className="shield-preferences__identityLabel">
                          Ownership Entities
                        </span>
                        <div className="shield-preferences__identityValue">
                          <EntityRefLinks entityRefs={ownershipRefs} />
                        </div>
                      </div>
                      <div className="shield-preferences__identityMeta">
                        <span>{ownershipRefs.length} ownership entities</span>
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
            <span>System Status: Optimal</span>
            <span>Secure Link: Established</span>
          </div>
          <div className="shield-preferences__footerGroup shield-preferences__footerGroup--right">
            <span>SHIELD OS v1.38.3</span>
          </div>
        </footer>
      </Container>
    </div>
  );
};
