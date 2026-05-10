using System.Text.Json;
using System.Text.Json.Serialization;
using Azure.Core;
using Azure.Identity;
using FraudDemo.Application.Abstractions;
using FraudDemo.Application.Configuration;
using FraudDemo.Application.Services;
using FraudDemo.Functions.Dtos;
using FraudDemo.Infrastructure.Ai;
using FraudDemo.Infrastructure.Detection;
using FraudDemo.Infrastructure.Persistence;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication()
    .ConfigureAppConfiguration(c => c.AddEnvironmentVariables())
    .ConfigureServices((ctx, services) =>
    {
        services.AddApplicationInsightsTelemetryWorkerService();

        services.Configure<JsonSerializerOptions>(o =>
        {
            o.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
            o.Converters.Add(new JsonStringEnumConverter());
        });

        services.Configure<StorageOptions>(ctx.Configuration.GetSection("Storage"));
        services.Configure<FoundryOptions>(ctx.Configuration.GetSection("Foundry"));
        services.Configure<DetectionOptions>(ctx.Configuration.GetSection("Detection"));
        services.Configure<AgentToolOptions>(ctx.Configuration.GetSection("Agent"));

        services.AddSingleton<TokenCredential>(_ => new DefaultAzureCredential());

        services.AddSingleton<IClock, SystemClock>();
        services.AddSingleton<IRandomSource, DefaultRandomSource>();
        services.AddSingleton<IEmployeeGenerator, EmployeeGenerator>();
        services.AddSingleton<IFraudInjector, FraudInjector>();
        services.AddSingleton<IAnomalyScorer, MlNetAnomalyScorer>();
        services.AddSingleton<IAnomalyScorer, SdcaAnomalyScorer>();
        services.AddSingleton<IAnomalyScorer, FastForestAnomalyScorer>();
        services.AddSingleton<IRunRepository, BlobRunRepository>();
        services.AddSingleton<IAiInvestigator, AgentInvestigator>();
        services.AddSingleton<IRunDataQueryService, RunDataQueryService>();
        services.AddSingleton<IFoundryToolboxClient, FoundryToolboxClient>();

        services.AddSingleton<SimulationConfigurationMapper>();
        services.AddSingleton<GenerateRunHandler>();
        services.AddSingleton<InvestigateCaseHandler>();
    })
    .Build();

await host.RunAsync();
