export class ApiError extends Error {
	public readonly status: number;
	public readonly statusText: string;
	public readonly url: string;
	public readonly body: unknown;

	public constructor(response: Response, body: unknown) {
		const message = `API error ${String(response.status)} (${response.statusText}) at ${response.url}`;
		super(message);
		this.name = "ApiError";
		this.status = response.status;
		this.statusText = response.statusText;
		this.url = response.url;
		this.body = body;
	}
}
