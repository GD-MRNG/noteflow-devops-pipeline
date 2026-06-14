terraform {
  cloud {
    # Replace with your Terraform Cloud organization name.
    # Workspaces: noteflow-staging (auto-apply) and noteflow-production (manual approval).
    # Set TF_WORKSPACE env var in CI to target the correct workspace per environment.
    organization = "YOUR_TF_CLOUD_ORG"

    workspaces {
      tags = ["noteflow"]
    }
  }
}
