# TunnelHub Healthcheck - Rotas Autenticadas

Automatização para monitoramento de saúde de rotas autenticadas do TunnelHub. Esta automação verifica a disponibilidade e integridade de endpoints autenticados da plataforma, enviando heartbeats para o Uptime Kuma em caso de sucesso.

## 📋 Descrição

Este projeto é uma automação que realiza verificações de saúde em rotas autenticadas do TunnelHub. A automação:

1. **Autentica-se** no sistema via AWS Cognito usando credenciais configuradas
2. **Verifica** endpoints críticos da plataforma:
   - `/user-service/currentUser` - Usuário atual
   - `/platform-service/environments` - Ambientes disponíveis
   - `/integrations-service/automations` - Automações do ambiente
   - `/apigw-service/apiGateways` - API Gateways do ambiente
3. **Envia heartbeat** para o Uptime Kuma apenas se todas as verificações forem bem-sucedidas
4. **Registra** logs detalhados de cada verificação para monitoramento

## 🏗️ Estrutura do Projeto

```
th-tunnelhub-healthcheck-authenticated-routes/
├── src/
│   ├── core/
│   │   └── integration.ts          # Lógica principal da integração
│   ├── types/
│   │   └── integration.ts          # Definições de tipos TypeScript
│   ├── metadata.ts                 # Metadados para monitoramento
│   └── index.ts                    # Ponto de entrada da automação
├── __tests__/                      # Testes unitários
│   ├── index.test.ts
│   └── classes/
│       └── integration.test.ts
├── dist/                           # Código compilado (gerado pelo build)
├── tunnelhub.yml                   # Configuração do TunnelHub
├── tsconfig.json                   # Configuração do TypeScript
├── jest.config.js                  # Configuração do Jest
├── package.json                    # Dependências e scripts
└── README.md                       # Este arquivo
```

## 🔄 Fluxo de Integração

A automação utiliza o padrão **NoDeltaBatch** do @tunnelhub/sdk, que processa todos os itens sem rastreamento de mudanças. O fluxo é:

1. **Inicialização**: Configura interceptores de HTTP (se habilitado) e valida parâmetros
2. **Carregamento dos Dados**: Define as rotas a serem verificadas (`loadSourceSystemData`)
3. **Autenticação**: Obtém token JWT do Cognito via credenciais configuradas
4. **Processamento**: Para cada rota configurada:
   - Faz requisição GET com token de autenticação
   - Verifica status da resposta (2xx = sucesso)
   - Registra resultado e dados de monitoramento
5. **Pós-Processamento**: Se não houver erros, envia heartbeat para Uptime Kuma
6. **Finalização**: Retorna sucesso ou erro baseado nos resultados

## 🧩 Componentes Principais

### `src/index.ts`
Ponto de entrada da automação. Cria instância da `Integration` e executa o fluxo padrão do SDK.

### `src/core/integration.ts`
Classe principal que estende `NoDeltaIntegrationFlow`. Implementa:

- `pushUptimeHeartbeat()`: Envia heartbeat para Uptime Kuma
- `loadSourceSystemData()`: Define rotas a serem verificadas
- `sendData()`: Executa verificação de cada rota autenticada
- `postProcessingCustomerRoutines()`: Executa heartbeat se todas as verificações forem bem-sucedidas
- `getIdToken()`: Obtém e cacheia token JWT do Cognito

### `src/types/integration.ts`
Define o tipo `AuthenticatedRouteCheck`:

```typescript
type AuthenticatedRouteCheck = {
  name: string;                      // Nome da rota para identificação
  url: string;                       // URL completa do endpoint
  headers?: Record<string, string>;  // Headers adicionais (ex: environmentId)
}
```

### `src/metadata.ts`
Define colunas visíveis na tela de monitoramento:
- **Check**: Nome da rota verificada
- **URL**: URL do endpoint

## 📐 Regras de Negócio

### Autenticação
- Utiliza fluxo `USER_PASSWORD_AUTH` do Cognito
- Credenciais obtidas do sistema `TUNNELHUB_UPTIME` configurado
- O sistema deve ser do tipo `HTTP` com autenticação `BASIC`
- Token é cacheado durante a execução para evitar múltiplas autentaicações

### Verificação de Rotas
- Todas as rotas são verificadas com método HTTP GET
- Headers obrigatórios:
  - `Authorization: Bearer {idToken}`
  - Headers adicionais configurados (ex: `environmentId`)
- Status 2xx é considerado sucesso
- Primeiros 500 caracteres do corpo da resposta são logados em caso de erro

### Heartbeat do Uptime Kuma
- Enviado APENAS se todas as verificações forem bem-sucedidas
- Método GET configurado via parâmetro `uptime_push_url`
- Falha no heartbeat não impede sucesso da automação (gera erro separado)

### Logging
- Parâmetro `log_http_requests` habilita interceptores para log de todas as requisições HTTP
- Útil para debugging em ambiente de desenvolvimento

## ⚠️ Tratamento de Erros e Logs

### Erros Críticos
- **Credenciais ausentes**: Lança erro se parâmetros obrigatórios não forem encontrados
- **Falha na autenticação**: Lança erro com detalhes da resposta do Cognito
- **Sistema não configurado**: Lança erro se sistema `TUNNELHUB_UPTIME` não estiver atribuído corretamente
- **Falha no heartbeat**: Lança erro com status HTTP da resposta

### Logs de Monitoramento
Para cada verificação, é registrado:
- Nome da rota (`name`)
- Status HTTP (`status`)
- Mensagem de sucesso ou erro com detalhes
- Primeiros 500 caracteres do corpo em caso de erro

### Níveis de Log
O SDK registra automaticamente:
- **INFO**: Início/fim de execução, métricas gerais
- **ERROR**: Falhas em verificações individuais
- **WARN**: Alertas não críticos

## 🔧 Tarefas de Manutenção

### Atualização de Rotas
Para adicionar/remover rotas verificadas, edite `src/core/integration.ts` no método `loadSourceSystemData()`:

```typescript
protected async loadSourceSystemData(): Promise<AuthenticatedRouteCheck[]> {
    // ... código existente ...
    return [
        {
            name: 'nova-rota',
            url: `${apiBaseUrl}/novo-endpoint`,
            headers: { /* headers adicionais */ }
        },
        // ... rotas existentes ...
    ];
}
```

### Atualização de Metadados
Para adicionar colunas na tela de monitoramento, edite `src/metadata.ts`:

```typescript
export default [
    // ... campos existentes ...
    {
        fieldName: 'responseTime',
        fieldLabel: 'Tempo de Resposta',
        fieldType: 'NUMBER',
    },
] as Metadata<AuthenticatedRouteCheck>[];
```

### Execução de Testes
```bash
# Executar todos os testes
yarn test

# Executar com cobertura
yarn test:coverage

# Gerar badge de cobertura
yarn test:badges
```

### Deploy em Ambientes
```bash
# Ambiente de Desenvolvimento
yarn deploy:dev --message "Descrição da alteração"

# Ambiente de Produção
yarn deploy:prd --message "Descrição da alteração"

# Deploy manual em ambiente específico
yarn build && th deploy-automation --env NOME_AMBIENTE --message "Descrição"
```

### Monitoramento
- Acesse a tela de automações no TunnelHub para ver execuções
- Verifique colunas "Check" e "URL" para detalhes de cada verificação
- Configure alertas no Uptime Kuma para notificações de falha

## ⚙️ Configuração de Ambiente

### Variáveis de Parâmetros (Obrigatórias)
Configure no TunnelHub:

| Parâmetro | Descrição | Exemplo |
|-----------|-----------|---------|
| `api_base_url` | URL base da API do TunnelHub | `https://api.tunnelhub.io` |
| `environment_id` | ID do ambiente a ser verificado | `uuid-do-ambiente` |
| `uptime_push_url` | URL do push do Uptime Kuma | `https://uptime.kuma.io/api/push/xxx` |

### Sistema Configurado
Configure o sistema `TUNNELHUB_UPTIME` no TunnelHub com:
- **Tipo**: HTTP
- **Autenticação**: BASIC
- **Parâmetros**:
  - `url`: URL do endpoint de autenticação do Cognito
  - `user`: Usuário do Cognito
  - `password`: Senha do Cognito
  - `cognito_client_id`: Client ID do App Cognito
  - `authType`: Deve ser `BASIC`

### Configuração da AWS Lambda
Configurações padrão em `tunnelhub.yml`:

```yaml
runtime: nodejs22.x
memorySize: 512mb
timeout: 30s
```

Ajuste conforme necessário:
- Aumente `timeout` se as verificações demorarem mais de 30s
- Aumente `memorySize` se houver processamento adicional de dados

### Variáveis de Ambiente
O projeto não utiliza variáveis de ambiente adicionais. Todas as configurações são feitas via parâmetros do TunnelHub.

## 📦 Gerenciador de Pacotes

Este projeto utiliza **Yarn** como gerenciador de pacotes padrão.

### Comandos Disponíveis

```bash
# Instalar dependências
yarn install

# Executar testes
yarn test

# Executar testes com cobertura
yarn test:coverage

# Compilar projeto
yarn build

# Verificar tipos TypeScript
yarn tsc
```

## 🚀 Início Rápido

1. **Clone o repositório**
   ```bash
   git clone <repositorio>
   cd th-tunnelhub-healthcheck-authenticated-routes
   ```

2. **Instale as dependências**
   ```bash
   yarn install
   ```

3. **Configure os parâmetros no TunnelHub**
   - `api_base_url`
   - `environment_id`
   - `uptime_push_url`

4. **Configure o sistema `TUNNELHUB_UPTIME`**
   - Tipo: HTTP
   - Autenticação: BASIC
   - Parâmetros do Cognito

5. **Execute os testes**
   ```bash
   yarn test
   ```

6. **Faça o deploy**
   ```bash
   yarn deploy:dev --message "Deploy inicial"
   ```

## 📚 Documentação Adicional

- [Documentação do TunnelHub](https://docs.tunnelhub.io)
- [Documentação do @tunnelhub/sdk](https://docs.tunnelhub.io/sdk)
- [AWS Cognito User Password Auth](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools-authentication-flow.html)

## 📝 Licença

UNLICENSED

## 👥 Suporte

Para questões relacionadas ao TunnelHub, consulte nossa [documentação oficial](https://docs.tunnelhub.io) ou abra uma issue no repositório do projeto.
