import axios from "axios";

// IConfig is the configuration for Kubeapps
export interface IConfig {
  namespace: string;
  appVersion: string;
  error?: Error;
  enableBasicForm: boolean;
}

export default class Config {
  public static async getConfig() {
    const url = Config.APIEndpoint;
    const { data } = await axios.get<IConfig>(url);

    // Development environment config overrides
    // TODO(miguel) Rename env variable to KUBEAPPS_NAMESPACE once/if we eject create-react-app
    // Currently we are using REACT_APP_* because it's the only way to inject env variables in a sealed setup.
    // Please note that this env variable gets mapped in the run command in the package.json file
    if (process.env.NODE_ENV !== "production") {
      data.appVersion = "DEVEL";
      if (process.env.REACT_APP_KUBEAPPS_NS) {
        data.namespace = process.env.REACT_APP_KUBEAPPS_NS;
      }
      if (process.env.REACT_APP_KUBEAPPS_ENABLE_BASIC_FORM === "true") {
        data.enableBasicForm = true;
      }
    }

    return data;
  }

  private static APIEndpoint: string = "config.json";
}
