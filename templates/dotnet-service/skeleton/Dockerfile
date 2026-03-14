FROM acrwakandause2hubiszw.azurecr.io/base-dotnet${{ values.dotnetVersion | replace(".", "") }}:latest
COPY ./publish .
ENV DOTNET_DLL=${{ values.name }}.Api.dll
