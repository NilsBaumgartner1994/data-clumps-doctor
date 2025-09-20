.PHONY: all build run clean

# Default value for the DIRECTORY variable
SOURCE := ./testSrc/java
DESTINATION := ./../testDataParsedAst/testSrc
IGNORE_DUBLICATE_DEFINITION := true
IGNORE_WILDCARD_IMPORTS := true
GENERATE_REFERENCES_OF_FIELDS_AND_METHODS := true

# Determine the appropriate remove command based on the operating system
ifeq ($(OS),Windows_NT)
    RM := rmdir /s /q
else
    RM := rm -rf
endif

all: clean build run

setup:
	./mvnw clean install

build: buildOffline

buildOffline: unzipCache
	# Offline-Build: Baue das Projekt und kopiere JARs aus libLocal
	./mvnw -o -Dmaven.repo.local=./cache clean install
	cp ./pmd-java-custom/target/pmd-java-custom-1.0.0-SNAPSHOT.jar ./libLocal/
	mkdir -p ./pmd-bin-7.0.0-rc3/lib/
	@if ls libLocal/*.jar 1> /dev/null 2>&1; then \
		cp libLocal/*.jar ./pmd-bin-7.0.0-rc3/lib/; \
	else \
		echo "WARNUNG: Keine JARs in libLocal gefunden! Bitte zuerst 'make downloadDependencies' und 'make buildOnline' ausführen."; \
		exit 1; \
	fi
	# Falls weitere JARs benötigt werden, hier ergänzen

buildOnline:
	# Online-Build: Nutze JARs aus Maven-Repository
	./mvnw clean install
	cp ./pmd-java-custom/target/pmd-java-custom-1.0.0-SNAPSHOT.jar ./pmd-bin-7.0.0-rc3/lib/
	cp ./pmd-java-custom/target/pmd-java-custom-1.0.0-SNAPSHOT.jar ./libLocal/
	# Falls weitere JARs benötigt werden, hier ergänzen

run:
	@echo "Start time: $$(date)"; \
	START_TIME=$$(date +%s); \
	export DESTINATION="$(DESTINATION)"; \
	export SOURCE="$(SOURCE)"; \
	export IGNORE_DUBLICATE_DEFINITION=$(IGNORE_DUBLICATE_DEFINITION); \
	export GENERATE_REFERENCES_OF_FIELDS_AND_METHODS=$(GENERATE_REFERENCES_OF_FIELDS_AND_METHODS); \
	export IGNORE_WILDCARD_IMPORTS=$(IGNORE_WILDCARD_IMPORTS); \
	$(RM) "$(DESTINATION)"; \
	./pmd-bin-7.0.0-rc3/bin/pmd check -d "$(SOURCE)" -f text -R custom-java-ruleset.xml; \
	echo "End time: $$(date)"; \
	END_TIME=$$(date +%s); \
	ELAPSED_TIME=$$((END_TIME - START_TIME)); \
	echo "Elapsed time: $$ELAPSED_TIME seconds"


clean:
ifeq ($(OS),Windows_NT)
	$(RM) -rf ./pmd-java-dist/target/
	$(RM) -rf ./pmd-java-custom/target/
else
	sudo chown -R $(shell whoami) ./pmd-java-dist/target/ || true
	chmod -R u+w ./pmd-java-dist/target/ || true
	$(RM) -rf ./pmd-java-dist/target/ || sudo rm -rf ./pmd-java-dist/target/
	sudo chown -R $(shell whoami) ./pmd-java-custom/target/ || true
	chmod -R u+w ./pmd-java-custom/target/ || true
	$(RM) -rf ./pmd-java-custom/target/ || sudo rm -rf ./pmd-java-custom/target/
endif

cleanCache:
	$(RM) -rf ./cache
	$(RM) -rf ~/.m2/repository

designer:

zipCache:
	@if [ -d ./cache ]; then \
		zip -r cache.zip cache; \
	else \
		echo "Kein cache-Ordner zum Zippen vorhanden."; \
	fi

unzipCache:
	@if [ -f cache.zip ]; then \
		unzip -o cache.zip; \
	else \
		echo "Kein cache.zip zum Entpacken vorhanden."; \
	fi

downloadDependencies:
	# 1. Custom-JAR bauen
	./mvnw -pl pmd-java-custom clean install -Dmaven.repo.local=./cache
	# 2. Custom-JAR ins lokale Repo installieren
	./mvnw install:install-file -Dfile=./pmd-java-custom/target/pmd-java-custom-1.0.0-SNAPSHOT.jar -DgroupId=net.sourceforge.pmd.examples -DartifactId=pmd-java-custom -Dversion=1.0.0-SNAPSHOT -Dpackaging=jar -Dmaven.repo.local=./cache
	# 3. Alle Abhängigkeiten, Plugins, Parent-POMs, Extensions ins lokale Repo laden (für alle Module)
	./mvnw dependency:go-offline -Dmaven.repo.local=./cache
	./mvnw dependency:resolve -Dmaven.repo.local=./cache
	./mvnw dependency:resolve-plugins -Dmaven.repo.local=./cache
	./mvnw validate -Dmaven.repo.local=./cache
	./mvnw install -Dmaven.repo.local=./cache
	make zipCache
