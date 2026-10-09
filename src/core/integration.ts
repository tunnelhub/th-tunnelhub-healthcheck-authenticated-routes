import {
    AutomationParameter,
    IntegrationMessageReturn,
    Metadata,
    NoDeltaIntegrationFlow,
    ProcessorPayload,
    setupInterceptor
} from '@tunnelhub/sdk';
import {AuthenticatedRouteCheck} from '../types/integration';
import metadata from '../metadata';

export default class Integration extends NoDeltaIntegrationFlow<AuthenticatedRouteCheck> {
    private idToken?: string;

    constructor(event: ProcessorPayload, context?: any) {
        super(event, context);

        const logHttpRequests = AutomationParameter.getBooleanParameter(this.parameters, 'log_http_requests', false);
        if (logHttpRequests) {
            setupInterceptor();
        }
    }

    defineMetadata(): Metadata[] {
        return metadata;
    }

    public async pushUptimeHeartbeat(): Promise<void> {
        const pushUrl = AutomationParameter.getRequiredParameter(this.parameters, 'uptime_push_url');
        const response = await fetch(pushUrl, {
            method: 'GET',
        });
        if (!response.ok) {
            throw new Error(`Uptime Kuma push failed with ${response.status}`);
        }
    }

    protected async loadSourceSystemData(): Promise<AuthenticatedRouteCheck[]> {
        const apiBaseUrl = AutomationParameter.getRequiredParameter(this.parameters, 'api_base_url');
        const environmentId = AutomationParameter.getRequiredParameter(this.parameters, 'environment_id');
        return [
            {
                name: 'current-user',
                url: `${apiBaseUrl}/user-service/currentUser`,
            },
            {
                name: 'platform-environments',
                url: `${apiBaseUrl}/platform-service/environments`,
            },
            {
                name: 'integrations-automations',
                url: `${apiBaseUrl}/integrations-service/automations`,
                headers: {
                    environmentId,
                },
            },
            {
                name: 'apigw-api-gateways',
                url: `${apiBaseUrl}/api-gateway-service/apiGateways`,
                headers: {
                    environmentId,
                },
            }
        ];
    }

    protected async sendData(check: AuthenticatedRouteCheck): Promise<IntegrationMessageReturn> {
        const idToken = await this.getIdToken();
        const response = await fetch(check.url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${idToken}`,
                TenantId: this.executionEvent.tenantId,
                ...check.headers,
            },
        });
        const body = await response.text();
        if (!response.ok) {
            throw Error(`${check.name} failed with ${response.status}: ${body.slice(0, 500)}`)
        }
        return {
            message: `${check.name} OK`,
            data: {
                name: check.name,
                status: response.status,
            },
        };
    }

    protected async postProcessingCustomerRoutines(): Promise<void> {
        if (!this.hasAnyErrors()) {
            await this.pushUptimeHeartbeat();
        }
    }

    private async getIdToken(): Promise<string> {
        if (this.idToken) {
            return this.idToken;
        }
        const system = this.systems.find(sys => sys.internalName === 'TUNNELHUB_UPTIME');
        if (!system || system.type !== 'HTTP' || system.parameters.authType !== 'BASIC') {
            throw Error(`O sistema ${system.internalName} precisa estar atribuído e ser do tipo HTTP`)
        }
        const clientId = AutomationParameter.getRequiredParameter(system.parameters, 'cognito_client_id');
        const response = await fetch(system.parameters.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-amz-json-1.1',
                'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
            },
            body: JSON.stringify({
                AuthFlow: 'USER_PASSWORD_AUTH',
                ClientId: clientId,
                AuthParameters: {
                    USERNAME: system.parameters.user,
                    PASSWORD: system.parameters.password,
                },
            }),
        });
        const body = await response.json();
        if (!response.ok || !body.AuthenticationResult?.IdToken) {
            throw new Error(`Cognito login failed: ${JSON.stringify(body)}`);
        }
        this.idToken = body.AuthenticationResult.IdToken;
        return this.idToken;
    }
}
