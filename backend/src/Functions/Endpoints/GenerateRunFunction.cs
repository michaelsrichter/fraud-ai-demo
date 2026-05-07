using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using FraudDemo.Application.Services;
using FraudDemo.Functions.Dtos;
using FraudDemo.Functions.ErrorHandling;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace FraudDemo.Functions.Endpoints;

public sealed class GenerateRunFunction
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly GenerateRunHandler _handler;
    private readonly SimulationConfigurationMapper _mapper;
    private readonly ILogger<GenerateRunFunction> _logger;

    public GenerateRunFunction(GenerateRunHandler handler, SimulationConfigurationMapper mapper, ILogger<GenerateRunFunction> logger)
    {
        _handler = handler;
        _mapper = mapper;
        _logger = logger;
    }

    [Function("createRun")]
    public async Task<HttpResponseData> RunAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "runs")] HttpRequestData req,
        CancellationToken cancellationToken)
    {
        SimulationConfigurationDto? dto;
        try
        {
            dto = await JsonSerializer.DeserializeAsync<SimulationConfigurationDto>(req.Body, JsonOptions, cancellationToken);
        }
        catch (JsonException ex)
        {
            return await req.ProblemAsync(HttpStatusCode.BadRequest, "Invalid JSON", ex.Message, cancellationToken: cancellationToken);
        }

        if (dto is null)
        {
            return await req.ProblemAsync(HttpStatusCode.BadRequest, "Missing body", "Request body is required.", cancellationToken: cancellationToken);
        }

        try
        {
            var config = _mapper.Map(dto);
            var ownerId = req.Headers.TryGetValues("X-User-Id", out var ids) ? ids.FirstOrDefault() ?? "" : "";
            var run = await _handler.HandleAsync(config, ownerId, cancellationToken);
            var response = req.CreateResponse(HttpStatusCode.Created);
            response.Headers.Add("Location", $"/api/runs/{run.RunId:D}");
            await response.WriteAsJsonAsync(run, cancellationToken);
            return response;
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Validation failure on createRun");
            return await req.ValidationProblemAsync(ex.Message, ExtractErrors(ex), cancellationToken);
        }
    }

    private static IDictionary<string, string[]> ExtractErrors(ArgumentException ex)
    {
        var key = string.IsNullOrWhiteSpace(ex.ParamName) ? "body" : ex.ParamName;
        return new Dictionary<string, string[]> { [key] = new[] { ex.Message } };
    }
}
