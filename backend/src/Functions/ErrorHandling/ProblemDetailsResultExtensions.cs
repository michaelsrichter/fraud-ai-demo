using System.Net;
using Microsoft.Azure.Functions.Worker.Http;

namespace FraudDemo.Functions.ErrorHandling;

/// <summary>RFC 7807 problem-details helpers (matches the ProblemDetails schema in contracts/api.openapi.yaml).</summary>
public static class ProblemDetailsResultExtensions
{
    public static async Task<HttpResponseData> ProblemAsync(
        this HttpRequestData req,
        HttpStatusCode status,
        string title,
        string? detail = null,
        IDictionary<string, string[]>? errors = null,
        CancellationToken cancellationToken = default)
    {
        var response = req.CreateResponse(status);
        response.Headers.Add("Content-Type", "application/problem+json");
        var body = new
        {
            type = $"https://httpstatuses.io/{(int)status}",
            title,
            status = (int)status,
            detail,
            instance = req.Url.AbsolutePath,
            errors,
        };
        await response.WriteAsJsonAsync(body, cancellationToken);
        response.StatusCode = status;
        return response;
    }

    public static Task<HttpResponseData> NotFoundAsync(this HttpRequestData req, string title, string detail, CancellationToken ct = default) =>
        ProblemAsync(req, HttpStatusCode.NotFound, title, detail, cancellationToken: ct);

    public static Task<HttpResponseData> ValidationProblemAsync(this HttpRequestData req, string detail, IDictionary<string, string[]> errors, CancellationToken ct = default) =>
        ProblemAsync(req, HttpStatusCode.BadRequest, "Validation failed", detail, errors, ct);
}
