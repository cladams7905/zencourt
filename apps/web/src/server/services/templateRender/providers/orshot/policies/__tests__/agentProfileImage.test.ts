import { applyAgentProfileImagePolicy } from "../agentProfileImage";

describe("templateRender/policies/agentProfileImage", () => {
  it("sets transparent image URL when agentProfileImage is missing", () => {
    const result = applyAgentProfileImagePolicy({
      resolvedParameters: {
        headerText: "A Header"
      }
    });

    expect(result.agentProfileImage).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/c/ce/Transparent.gif"
    );
  });

  it("preserves agentProfileImage when configured", () => {
    const result = applyAgentProfileImagePolicy({
      resolvedParameters: {
        agentProfileImage: "https://cdn.example.com/headshot.jpg"
      }
    });

    expect(result.agentProfileImage).toBe(
      "https://cdn.example.com/headshot.jpg"
    );
  });
});
